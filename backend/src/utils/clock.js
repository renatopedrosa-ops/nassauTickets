// Relógio injetável: em produção devolve a hora real; nos testes pode ser fixado.
let fixedNow = null;

export const now = () => (fixedNow ? new Date(fixedNow.getTime()) : new Date());

export const setNow = (date) => {
  fixedNow = date ? new Date(date) : null;
};
