import { defs, tradeItemIds, type TradeItemId } from './defs'
import { addItem, removeItem, withinLimit, withSlots } from './inventory'
import type { State } from './state'

export function offer(itemId: string): { itemId: TradeItemId; buy: number; sell: number } | null {
  if (!isTradeItem(itemId)) return null
  const buy = defs.trade.prices[itemId]
  return { itemId, buy, sell: Math.floor(buy / 2) }
}

export function buy(state: State, merchantId: string, itemId: string): State {
  const quote = quoteFor(state, merchantId, itemId)
  if (!quote || state.silver < quote.buy) return state
  const slots = addItem(state.inventory.slots, quote.itemId, 1)
  if (!slots || !withinLimit(slots, state.inventory.limit)) return state
  return { ...withSlots(state, slots), silver: state.silver - quote.buy }
}

export function sell(state: State, merchantId: string, itemId: string): State {
  const quote = quoteFor(state, merchantId, itemId)
  if (!quote) return state
  const slots = removeItem(state.inventory.slots, quote.itemId, 1)
  if (!slots) return state
  return { ...withSlots(state, slots), silver: state.silver + quote.sell }
}

function quoteFor(state: State, merchantId: string, itemId: string) {
  if (!state.merchants.some((merchant) => merchant.id === merchantId)) return null
  return offer(itemId)
}

function isTradeItem(itemId: string): itemId is TradeItemId {
  return (tradeItemIds as readonly string[]).includes(itemId)
}
