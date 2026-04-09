function luhnCheck(number) {
  const digits = number.replace(/\s/g, "");
  if (!/^\d{16,19}$/.test(digits)) return false;

  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function isValidCard(number) {
  return luhnCheck(number);
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  return /^7\d{10}$/.test(digits) || /^\d{10}$/.test(digits);
}

module.exports = { luhnCheck, isValidCard, isValidPhone };
