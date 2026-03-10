# SimHub Plugin Feedback

This document contains my observations from an hour of testing the plugin and dashboard last night. read them all, formulate a plan for how to do this work with the "next steps" in mind as a future version (without actually performing that work right now). execute that plan, possibly re-evaluating the original data sources for more granular information.

## Prompt Diversity

### Problem

i pretty much only got two prompts: one asking about the car fighting me or balanced, and the other asking me what the car needs to be fast. i got one more at the beginning of the sessions sometimes about fuel and how many laps. We need to diversify the prompts i receive, and possibly tune the events to get more timely information.

### Solution

1. investigate the prompt events, and figure out why i was only receiving car balance prompts.
2. figure out how to diversify these prompts such that an interesting prompting session occurs that is moderately different from the last one. my experiences were all almost identical here
3. update the prompt eventing system such that it fires when something happens on track, not only on the scheduled interval

## Prompt TIming

### Problem

i was expecting more in-depth suggestions about events as they happen on-track, but the prompts seemed to take a long time to show up, and stuck around for much longer than i expected. also, the countdown timer just didn't work at all; it was spamming the text field with numbers, or just not displaying anything. above and beyond the observation that the settings panel didn't seem to affect the plugin's behavior at all, which we need to fix for how long the prompts stay on screen.

### Solution

1. remove the setting for prompt timing, since we are alerting when things happen now, not on a schedule
2. give more granular choices for the dismissal setting, in 5 second increments
3. figure out why these settings didn't apply when in use, and why the prompts stayed around so long, and took so long to show up. fix these issues.

## Prompt sentiment

### Problem

while we added sentiment and background colors to the dataset, it doesn't affect the prompts in any way. we need to fine-tune the event timing, and attach sentiment and suggested statements to make, not simply questions about what to talk about. i was hoping for more of an opinionated system.

### Solution

this is the biggest lift of the update. we need a much more interesting and opinionated set of prompts than what i'm currently receiving.

1. investigate the updated list of diversified prompts, and break them up into sentiments related to the sentiments we added color coding for
2. change the suggestions made by the plugin from generic questions into sentiment-based statements, using the real-time data stream to identify and respond to trends on-track. pay incredibly close attention to: loss of grip, loss of control, crashing into objects, crashing into other drivers, going off-track, having car issues due to an accident, track conditions (rain, temperatures, time of year, time of day)
3. fine-tune the suggestions based on session type: time trial, test drive, official practice, qualifying, gridded up in race, formation lap in race, slow laps in race, hard/push laps in race, entering pits, etc.

## Next Steps: Testing

1. build a testing system such that we can take recorded race data, and generate transcripts of when a message would occur during a data stream
2. build a learning system such that we can take feedback to these testing results to fine-tune the eventing system, sentiments, and prompt text

---

## Version 2.0: AI-Generated Commentary via Claude API

Instead of selecting from a pre-written pool of commentary prompts, version 2.0 would call the Claude API (claude-haiku-4-5 for latency reasons) at the moment a telemetry event fires, generating a unique, contextually-aware line of commentary every time. The static `commentaryPrompts` arrays in the topics JSON become system prompt templates and style guides rather than the final text. This is the path toward genuinely non-repetitive, voice-matched, situation-aware commentary.

### Architecture

**New class: `CommentaryGenerator`**

A thin async wrapper around the Anthropic Messages API. Lives in `Engine/CommentaryGenerator.cs`. Responsible for:

1. Building a prompt from the current `TelemetrySnapshot` + the fired `CommentaryTopic`
2. Making a non-blocking HTTP POST to `https://api.anthropic.com/v1/messages`
3. Calling back into `CommentaryEngine` with the generated text when the response arrives

The key design constraint is that this must be **fire-and-forget with a callback** — never block the SimHub data loop. The engine fires the API call, immediately shows a brief loading state or the event exposition text (already built), then replaces it with the generated line when it arrives (~200-400ms for Haiku).

**New setting: `AnthropicApiKey`**

Added to `Settings.cs` and surfaced as a password-style text field in `Control.xaml`. The key is stored via SimHub's existing settings serialization (`SaveCommonSettings`) — not to disk in plaintext separately.

**System prompt construction**

The system prompt sent to the API would be assembled from three layers:

1. **Voice/style layer** — drawn from `channel_notes.json`, specifically Kevin's profile. Instructs the model to write in first person, present tense, technically grounded, direct, no filler phrases. The full style notes from `channel_notes.json` for the active channel feed directly into this.

2. **Event layer** — the fired topic's `title`, `sentiment`, `severity`, and `eventExposition` (already interpolated with live telemetry values). Tells the model what just happened and how urgent it is.

3. **Context layer** — a compact telemetry summary: session type, lap number, position, nearest opponents (names + iRatings), tyre state, fuel, weather, and the circuit position if available. Keeps the model grounded in the actual race situation.

Example assembled system prompt for a `position_lost` (severity 4) event:
```
You are Kevin, a technically-minded sim racing streamer. Write a single spoken commentary line
in first person, present tense. Be direct and specific. No filler phrases. Max 25 words.

EVENT: Position Lost [URGENT] — Overtaken by Sarah K. (2847 iR), dropped to P6
SESSION: Race, lap 14/20, Lime Rock Park
CONTEXT: P6 of 18, fuel 34%, fronts warm, gap to P7 is 1.2s
```

The model returns one line. That line replaces the prompt text in `_currentText`.

**Latency handling**

Because even Haiku takes 200-500ms, the display sequence is:

1. Event fires → `CurrentEventExposition` shown immediately (the interpolated short text, already built synchronously)
2. API call dispatched on a `Task.Run` thread
3. On API response: if the prompt is still visible (hasn't been interrupted by a higher-severity event), replace the text with the generated line

This means the exposition acts as a loading placeholder. In event-only mode, nothing changes — the exposition is the final output and no API call is made.

**Fallback**

If the API key is empty, the network is unavailable, or the call exceeds a 1.5s timeout, the engine falls back to the existing static prompt pool exactly as today. No degradation in the no-API path.

### New Settings

| Setting | Type | Default | Notes |
|---|---|---|---|
| `AnthropicApiKey` | string | "" | Stored via SimHub settings serialization |
| `AiCommentaryEnabled` | bool | false | Master toggle, requires key to activate |
| `AiMaxWords` | int | 25 | Caps generated line length |
| `AiFallbackOnTimeout` | bool | true | Use static pool if API exceeds 1.5s |

### What Doesn't Change

- The trigger system, severity system, interruption logic, and cooldowns are all unchanged. The AI path is purely a replacement for the final text selection step in `ShowPrompt()`.
- The dashboard requires no changes.
- Event-only mode bypasses AI generation entirely — the exposition string is always synchronous.
- The `channel_notes.json` file (currently unused by the plugin) gets a real job: its style profile for the active channel feeds the system prompt.

### Files Affected

- `Settings.cs` — two new fields
- `Control.xaml` / `Control.xaml.cs` — API key input + AI toggle
- `Engine/CommentaryGenerator.cs` — new file, async Anthropic API wrapper
- `Engine/CommentaryEngine.cs` — `ShowPrompt()` calls `CommentaryGenerator` when AI is enabled, handles callback
- `MediaCoach.Plugin.csproj` — add `System.Net.Http` reference if not already present

---

## Alpha Testing Results

1. colors still don't show up in the sentiment box. does simhub support hex8, the color format you're using? it doesn't seem to, or the values don't come through correctly. don't update the dashboard here, just the plugin.
2. i'd like a lot more attention paid to catastrophic events, like crashes into walls, going off tracks, and being passed.
3. another enhancement i'd like to see is including the names of the corner or straight i'm currently on (if more than simply T1, etc) as an extra displayable data point. bonus points if you can make the prompts include these circuit position names.
4. let's tune the events a little bit, their data thresholds are too low. you're telling me that i slipped or that the wheel had a large spike in feedback when it didn't really happen that strongly.
5. some positive notes to keep up/enhance: the timing at 15 seconds was much better this time; the wording of the prompts, while true to the source material could use some voicing, particularly from my own website at http://www.alternate.org
6. let's also include the sentiment text within the variable that displays the category name - no new variable to display, just additional text in the displayed value, if possible.
7. include more track incidents in the event system: unsafe conditions (gravel on the road, etc), accidents ahead and behind.
8. if i'm being passed or passing someone, tell me their name and rating in the prompt text. include context on whether they're passing or i am.
