import Decimal from 'decimal.js'
export const toUnit = (
  value: Decimal.Value | bigint,
  decimals: number | bigint = 9,
): bigint => {
  const v = value.toString()
  const d = decimals.toString()
  return BigInt(new Decimal(v).mul(Decimal.pow(10, d)).toFixed(0))
}
