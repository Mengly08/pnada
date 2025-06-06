import storeConfig from '../config/store.json';

export const getConfig = () => {
  return storeConfig;
};

export const getGameConfig = (game: 'mlbb' | 'freefire') => {
  return storeConfig.games[game];
};

export const getPaymentConfig = () => {
  return storeConfig.payment;
};

export default storeConfig;