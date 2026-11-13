export type TwilioEvent = 'connected' | 'start' | 'media' | 'stop' | 'mark' | 'clear';

export interface TwilioConnectedMessage {
  event: 'connected';
  protocol: string;
  version: string;
}

export interface TwilioStartMessage {
  event: 'start';
  sequenceNumber: string;
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  streamSid: string;
}

export interface TwilioMediaMessage {
  event: 'media';
  sequenceNumber: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // Base64 encoded mu-law 8kHz audio
  };
  streamSid: string;
}

export interface TwilioStopMessage {
  event: 'stop';
  sequenceNumber: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
  streamSid: string;
}

export interface TwilioOutboundMedia {
  event: 'media';
  streamSid: string;
  media: {
    payload: string; // Base64 encoded mu-law 8kHz audio
  };
}

export interface TwilioOutboundClear {
  event: 'clear';
  streamSid: string;
}

export type TwilioInboundMessage =
  | TwilioConnectedMessage
  | TwilioStartMessage
  | TwilioMediaMessage
  | TwilioStopMessage;
