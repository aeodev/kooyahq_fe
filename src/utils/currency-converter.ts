/**
 * Currency conversion utility
 * Uses exchangerate-api.com (free, no API key required)
 * Base currency: PHP
 */

// Cache for exchange rates (valid for 1 hour)
interface RateCache {
  rates: Record<string, number>
  timestamp: number
}

const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds
let rateCache: RateCache | null = null

/**
 * Fetches exchange rates from exchangerate-api.com
 * Returns rates relative to PHP
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
  try {
    // Fetch rates with PHP as base
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/PHP')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.rates || {}
  } catch (error) {
    console.error('[Currency Converter] Failed to fetch exchange rates:', error)
    throw error
  }
}

/**
 * Gets exchange rates with caching
 */
async function getExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now()
  
  // Check if cache is valid
  if (rateCache && (now - rateCache.timestamp) < CACHE_DURATION) {
    return rateCache.rates
  }
  
  // Fetch new rates
  const rates = await fetchExchangeRates()
  
  // Update cache
  rateCache = {
    rates,
    timestamp: now,
  }
  
  return rates
}

/**
 * Converts an amount from a source currency to PHP
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code (e.g., 'USD', 'EUR')
 * @returns Promise resolving to the amount in PHP
 */
export async function convertToPHP(
  amount: number,
  fromCurrency: string
): Promise<number> {
  // If already PHP, return as-is
  if (fromCurrency.toUpperCase() === 'PHP') {
    return amount
  }
  
  // Validate amount
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount')
  }
  
  try {
    const rates = await getExchangeRates()
    const currency = fromCurrency.toUpperCase()
    
    // Get rate for source currency
    // The API returns rates where PHP is base, so rates[USD] = USD per 1 PHP
    // Example: rates['USD'] = 0.0169 means 1 PHP = 0.0169 USD
    // To convert FROM USD TO PHP: if 1 PHP = 0.0169 USD, then 1 USD = 1/0.0169 PHP
    const rate = rates[currency]
    
    if (!rate || rate === 0) {
      console.warn(`[Currency Converter] Rate not found for ${currency}, using 1:1 fallback`)
      return amount // Fallback to 1:1 if rate not found
    }
    
    // Convert: amount in source currency / rate = amount in PHP
    // Example: 1000 USD / 0.0169 = 59,171 PHP
    return amount / rate
  } catch (error) {
    console.error(`[Currency Converter] Conversion failed for ${fromCurrency} to PHP:`, error)
    // Fallback to 1:1 conversion if API fails
    console.warn('[Currency Converter] Using 1:1 fallback due to API error')
    return amount
  }
}

/**
 * Converts an amount from PHP to a target currency
 * @param amount - The amount in PHP
 * @param toCurrency - Target currency code (e.g., 'USD', 'EUR')
 * @returns Promise resolving to the amount in target currency
 */
export async function convertFromPHP(
  amount: number,
  toCurrency: string
): Promise<number> {
  // If PHP, return as-is
  if (toCurrency.toUpperCase() === 'PHP') {
    return amount
  }
  
  // Validate amount
  if (isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount')
  }
  
  try {
    const rates = await getExchangeRates()
    const currency = toCurrency.toUpperCase()
    
    // Get rate for target currency
    // The API returns rates where PHP is base, so rates[USD] = USD per 1 PHP
    // Example: rates['USD'] = 0.0169 means 1 PHP = 0.0169 USD
    const rate = rates[currency]
    
    if (!rate || rate === 0) {
      console.warn(`[Currency Converter] Rate not found for ${currency}, using 1:1 fallback`)
      return amount // Fallback to 1:1 if rate not found
    }
    
    // Convert: amount in PHP * rate = amount in target currency
    // Example: 1000 PHP * 0.0169 = 16.9 USD
    return amount * rate
  } catch (error) {
    console.error(`[Currency Converter] Conversion failed for PHP to ${toCurrency}:`, error)
    // Fallback to 1:1 conversion if API fails
    console.warn('[Currency Converter] Using 1:1 fallback due to API error')
    return amount
  }
}

/**
 * Synchronously converts an amount from PHP to a target currency using cached rates
 * Returns 1:1 conversion if rates are not cached (fallback)
 * @param amount - The amount in PHP
 * @param toCurrency - Target currency code (e.g., 'USD', 'EUR')
 * @returns The amount in target currency
 */
export function convertFromPHPSync(
  amount: number,
  toCurrency: string
): number {
  // If PHP, return as-is
  if (toCurrency.toUpperCase() === 'PHP') {
    return amount
  }
  
  // Validate amount
  if (isNaN(amount) || amount < 0) {
    return amount
  }
  
  // Check if cache exists and is valid
  if (!rateCache) {
    // No cache available, return 1:1 fallback
    return amount
  }
  
  const currency = toCurrency.toUpperCase()
  const rate = rateCache.rates[currency]
  
  if (!rate || rate === 0) {
    // Rate not found in cache, return 1:1 fallback
    return amount
  }
  
  // Convert: amount in PHP * rate = amount in target currency
  // Example: 1000 PHP * 0.0169 = 16.9 USD
  return amount * rate
}

/**
 * Clears the exchange rate cache
 * Useful for testing or forcing a refresh
 */
export function clearRateCache(): void {
  rateCache = null
}
