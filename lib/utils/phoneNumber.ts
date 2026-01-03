/**
 * Normalizes phone numbers to a consistent format for authentication.
 * Converts phone numbers to E.164 format (e.g., +18473452436) to match iOS app format.
 * 
 * This ensures compatibility between iOS and web apps that might format
 * phone numbers differently.
 */

/**
 * Normalizes a phone number to E.164 format (with + and country code).
 * Matches the iOS app format: +[country code][10-digit number]
 * For US numbers: +1[area code][number] (e.g., +18473452436)
 * 
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number in E.164 format (e.g., +18473452436)
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return "";
  
  // Remove all non-digit characters to get just the digits
  const digits = phoneNumber.replace(/\D/g, "");
  
  if (digits.length === 0) return "";
  
  // If it already starts with +, clean it up and ensure proper format
  if (phoneNumber.startsWith("+")) {
    // Extract digits (removing the +)
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    
    // If it's 11 digits starting with 1, it's already correct E.164 for US (+18473452436)
    if (digitsOnly.length === 11 && digitsOnly[0] === "1") {
      return `+${digitsOnly}`; // Ensure it has the + prefix
    }
    
    // If it's 10 digits, add the +1 prefix
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    
    // If it's already in a valid format, return as is
    if (digitsOnly.length >= 11) {
      return `+${digitsOnly}`;
    }
    
    // For other cases with +, return normalized
    return phoneNumber;
  }
  
  // Handle digits-only input (no + prefix)
  // If it has 11 digits and starts with 1, it's a US number with country code
  // Example: 18473452436 → +18473452436
  if (digits.length === 11 && digits[0] === "1") {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume it's a US number and add +1
  // Example: 8473452436 → +18473452436
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // For other lengths, try to handle gracefully
  // If 11+ digits, assume first digit(s) are country code
  if (digits.length >= 11) {
    return `+${digits}`;
  }
  
  // For shorter numbers, still try to format (might be incomplete input)
  if (digits.length > 0 && digits.length < 10) {
    // If it's 7 digits, might be missing area code - can't normalize properly
    // But we'll still try to add +1
    return `+1${digits}`;
  }
  
  return "";
}

/**
 * Normalizes a phone number to digits-only format (no +, no spaces, no dashes).
 * This is useful for consistent storage and comparison.
 * 
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number with digits only
 */
export function normalizePhoneNumberToDigits(phoneNumber: string): string {
  if (!phoneNumber) return "";
  return phoneNumber.replace(/\D/g, "");
}

/**
 * Normalizes phone numbers for authentication email format.
 * Uses E.164 format to ensure consistency across platforms.
 * 
 * @param phoneNumber - The phone number to normalize
 * @returns Normalized phone number suitable for email format
 */
export function normalizePhoneForAuth(phoneNumber: string): string {
  return normalizePhoneNumber(phoneNumber);
}

