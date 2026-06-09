import type { CategoryInfo } from './types';

export const categories: CategoryInfo[] = [
  {
    id: 'web-security',
    name: 'Web Security',
    description: 'HTTP headers, SSL/TLS, CORS, cookies, and security configuration checks',
    icon: 'Shield',
    color: '#00f0ff',
    gradient: 'linear-gradient(135deg, #00f0ff, #0891b2)',
  },
  {
    id: 'dns',
    name: 'DNS & Domain',
    description: 'DNS records, WHOIS, SPF, DKIM, DMARC, and domain analysis',
    icon: 'Globe',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  },
  {
    id: 'network',
    name: 'Network Tools',
    description: 'IP lookup, port scanning, CIDR/subnet calculators, and network utilities',
    icon: 'Network',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
  },
  {
    id: 'encoding',
    name: 'Encoding & Decoding',
    description: 'Base64, URL, hex, binary, JWT, ROT13, Caesar cipher, and more',
    icon: 'Binary',
    color: '#00ff88',
    gradient: 'linear-gradient(135deg, #00ff88, #10b981)',
  },
  {
    id: 'hashing',
    name: 'Hashing & Crypto',
    description: 'MD5, SHA, HMAC, UUID, password generation, and hash identification',
    icon: 'Hash',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
  },
  {
    id: 'forensics',
    name: 'File & Forensics',
    description: 'EXIF metadata, MIME types, magic bytes, string extraction, and IOC analysis',
    icon: 'FileSearch',
    color: '#f472b6',
    gradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
  },
  {
    id: 'osint',
    name: 'OSINT & Threat Intel',
    description: 'Email analysis, GitHub secret scanning, and threat intelligence helpers',
    icon: 'Eye',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
  },
  {
    id: 'ctf',
    name: 'CTF Helpers',
    description: 'XOR, regex testing, cipher tools, and capture-the-flag utilities',
    icon: 'Flag',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  },
  {
    id: 'labs',
    name: 'Security Labs',
    description: 'Interactive SQL injection, XSS, and other vulnerability learning labs',
    icon: 'FlaskConical',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  },
];

export function getCategoryById(id: string): CategoryInfo | undefined {
  return categories.find((c) => c.id === id);
}
