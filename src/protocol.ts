// Copyright 2017-2022 @polkadot/app-btwiuse authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const PROTOCOL_VERSION = 2;
export const INPUT_CHUNK_SIZE = 4000;

export interface ResizeMessage {
  version: number;
  width: number;
  height: number;
  command?: string[];
  env?: Record<string, string>;
}

export type OutputMessage = [number, string, string];
