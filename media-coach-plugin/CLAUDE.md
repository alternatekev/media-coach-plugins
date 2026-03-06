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
