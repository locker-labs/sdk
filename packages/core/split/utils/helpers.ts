import { SPLIT_PLUGIN_ADDRESS } from "../def/splitPluginConfig";

async function isSplitPluginInstalled(extendedAccount: any): Promise<boolean> {
  const installedPlugins = await extendedAccount.getInstalledPlugins({});
  if (!installedPlugins.includes(SPLIT_PLUGIN_ADDRESS)) {
    return false;
  }
  return true;
}

export { isSplitPluginInstalled };
