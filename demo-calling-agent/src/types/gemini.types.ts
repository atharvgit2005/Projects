export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, {
      type: 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'ARRAY' | 'OBJECT';
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface GeminiSetupFrame {
  setup: {
    model: string;
    generationConfig: {
      responseModalities: ('AUDIO' | 'TEXT')[];
      speechConfig?: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: string;
          };
        };
      };
    };
    systemInstruction: {
      parts: { text: string }[];
    };
    tools?: {
      functionDeclarations: GeminiFunctionDeclaration[];
    }[];
  };
}

export interface GeminiRealtimeInputFrame {
  realtimeInput: {
    mediaChunks: {
      mimeType: string;
      data: string; // Base64 encoded audio
    }[];
  };
}

export interface GeminiToolResponseFrame {
  toolResponse: {
    functionResponses: {
      response: {
        output: Record<string, any>;
      };
      id: string;
    }[];
  };
}

export interface GeminiFunctionCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface GeminiServerFrame {
  serverContent?: {
    modelTurn?: {
      parts: {
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string; // Base64 PCM audio output
        };
      }[];
    };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: {
    functionCalls: GeminiFunctionCall[];
  };
}
