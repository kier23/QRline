declare module "speak-tts" {
  export default class Speech {
    init(options?: {
      volume?: number;
      lang?: string;
      rate?: number;
      pitch?: number;
      voice?: string;
      splitSentences?: boolean;
    }): Promise<void>;

    speak(options: {
      text: string;
      queue?: boolean;
      listeners?: {
        onstart?: () => void;
        onend?: () => void;
        onerror?: (e: any) => void;
      };
    }): Promise<void>;

    hasBrowserSupport(): boolean;
    getVoices(): SpeechSynthesisVoice[];
  }
}