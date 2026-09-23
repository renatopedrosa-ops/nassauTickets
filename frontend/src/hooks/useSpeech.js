import { useCallback, useState } from 'react';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

const pickVoice = () =>
  window.speechSynthesis.getVoices().find((voice) => voice.lang?.toLowerCase().startsWith('pt')) ?? null;

/** Anúncio por voz com a Web Speech API (RF11 / acessibilidade). */
export function useSpeech() {
  // Navegadores só liberam áudio após uma interação do usuário: por isso o botão "Ativar som".
  const [enabled, setEnabled] = useState(false);

  const speak = useCallback((text) => {
    if (!supported || !enabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }, [enabled]);

  const enable = useCallback(() => {
    if (!supported) return;
    setEnabled(true);
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  }, []);

  return { supported, enabled, enable, disable: () => setEnabled(false), speak };
}

/** Texto falado: "Última chamada. Senha prioritária, S P 0 0 1, Guichê 01". */
export const buildAnnouncement = ({ number, typeLabel, counterName, callCount }) => {
  const code = number.split('-')[1].split('').join(' ');
  const prefix = callCount > 1 ? 'Última chamada. ' : '';
  return `${prefix}Senha ${typeLabel.toLowerCase()}, ${code}. Dirija-se ao ${counterName}.`;
};
