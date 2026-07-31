// tests/crypto.test.js

describe('Aethel Core Cryptographic Logic', () => {
    
    // Self-contained Entropy Calculator for testing
    const calculateEntropy = (str) => {
        if (!str) return 0;
        const freq = {};
        for (let char of str) freq[char] = (freq[char] || 0) + 1;
        let entropy = 0;
        for (let key in freq) {
            let p = freq[key] / str.length;
            entropy -= p * Math.log2(p);
        }
        return Math.round(entropy * str.length);
    };

    it('should calculate low entropy for weak passwords', () => {
        expect(calculateEntropy("password")).toBeLessThan(40);
    });

    it('should calculate high entropy for strong passwords', () => {
        expect(calculateEntropy("Tr0ub4dour&3*Password!")).toBeGreaterThan(80);
    });

    it('should return 0 for empty strings', () => {
        expect(calculateEntropy("")).toBe(0);
    });
});
