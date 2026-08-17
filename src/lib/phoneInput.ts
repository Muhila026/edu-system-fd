/** Strips anything that isn't a digit, space, +, -, or parenthesis — used on every
 *  phone/contact-number field's onChange so letters can never be typed in. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^0-9+\-() ]/g, '')
}
