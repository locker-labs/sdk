import { chainToSplitPluginAddress } from "../defs/split/config";

async function isSplitPluginInstalled(
  extendedAccount: any,
  chainId: number
): Promise<boolean> {
  const splitPluginAddress = chainToSplitPluginAddress[chainId];
  const installedPlugins = await extendedAccount.getInstalledPlugins({});
  if (!installedPlugins.includes(splitPluginAddress)) {
    return false;
  }
  return true;
}

export { isSplitPluginInstalled };
