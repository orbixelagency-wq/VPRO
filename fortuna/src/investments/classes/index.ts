import type { ClassRules } from '../rules';
import type { AssetClassId } from '../types';
import { collectibleRules, entertainmentRules, p2pRules, philanthropyRules } from './alternative';
import { cfdRules, futureRules, optionRules } from './derivatives';
import { etfRules, fundRules, insuranceRules, pensionRules } from './funds';
import { commodityRules, cryptoRules, forexRules } from './markets';
import { businessRules, franchiseRules, startupRules } from './private';
import { energyRules, farmlandRules } from './real';
import { distressedRules, realEstateRules } from './realestate';

/** Reglas de cada clase de activo del catálogo. */
export const CLASS_RULES: Record<AssetClassId, ClassRules> = {
  etf: etfRules,
  fund: fundRules,
  pension: pensionRules,
  insurance: insuranceRules,
  crypto: cryptoRules,
  commodity: commodityRules,
  forex: forexRules,
  option: optionRules,
  future: futureRules,
  cfd: cfdRules,
  realestate: realEstateRules,
  distressed: distressedRules,
  business: businessRules,
  franchise: franchiseRules,
  startup: startupRules,
  farmland: farmlandRules,
  energy: energyRules,
  collectible: collectibleRules,
  entertainment: entertainmentRules,
  p2p: p2pRules,
  philanthropy: philanthropyRules,
};
