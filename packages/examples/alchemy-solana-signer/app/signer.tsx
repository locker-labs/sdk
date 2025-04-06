"use client";
import { useMemo } from "react";
import {
  useSigner,
  useSignerStatus,
} from "@account-kit/react";
import BridgeAndSplit from "./bridge-and-split";

export default function Signer() {
    const signer = useSigner();
    const status = useSignerStatus();

    const solanaSigner = useMemo(() => {
        if (!signer) return;
        if (!status.isConnected) return;
        return signer.experimental_toSolanaSigner();
    }, [signer, status.isConnected]);
    console.log('solanaSigner', solanaSigner);

    return <>
      <div>Signer status: {status?.status}</div>
      <div>Solana signer initialized: {!!solanaSigner ? 'yes' : 'no'}</div>
      {/* @ts-ignore */}
      {solanaSigner && <BridgeAndSplit solanaSigner={solanaSigner} />}
    </>
}