import { API } from 'homebridge';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { K10MediaCoachLightsPlatform } from './platform';

/**
 * Register the K10 Media Coach Lights platform plugin with Homebridge
 */
export default (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, K10MediaCoachLightsPlatform);
};
