const IPV4_BITS = BigInt(32);
const IPV6_BITS = BigInt(128);
const ZERO = BigInt(0);
const ONE = BigInt(1);

interface ParsedNetworkInput {
  version: 4 | 6;
  address: bigint;
}

function parseIpv4Address(input: string) {
  const octets = input.split('.').map((part) => Number(part));
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    throw new Error('Invalid IPv4 address.');
  }
  return octets.reduce((value, octet) => (value << BigInt(8)) + BigInt(octet), ZERO);
}

function formatIpv4Address(input: bigint) {
  return [
    Number((input >> BigInt(24)) & BigInt(255)),
    Number((input >> BigInt(16)) & BigInt(255)),
    Number((input >> BigInt(8)) & BigInt(255)),
    Number(input & BigInt(255)),
  ].join('.');
}

function expandIpv6(input: string) {
  if (input.includes(':::')) {
    throw new Error('Invalid IPv6 address.');
  }
  const [head, tail] = input.split('::');
  const headParts = head ? head.split(':').filter(Boolean) : [];
  const tailParts = tail ? tail.split(':').filter(Boolean) : [];
  const total = headParts.length + tailParts.length;
  if (total > 8) {
    throw new Error('Invalid IPv6 address.');
  }
  const zeroFill = input.includes('::') ? new Array(8 - total).fill('0') : [];
  const parts = [...headParts, ...zeroFill, ...tailParts];
  if (parts.length !== 8) {
    throw new Error('Invalid IPv6 address.');
  }
  return parts.map((part) => {
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
      throw new Error('Invalid IPv6 address.');
    }
    return part.padStart(4, '0').toLowerCase();
  });
}

function parseIpv6Address(input: string) {
  return expandIpv6(input).reduce((value, part) => (value << BigInt(16)) + BigInt(parseInt(part, 16)), ZERO);
}

function formatIpv6Address(input: bigint) {
  const parts: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    const shift = BigInt((7 - index) * 16);
    parts.push(((input >> shift) & BigInt(0xffff)).toString(16));
  }
  return parts.join(':').replace(/\b0(?=[0-9a-f])/g, '');
}

function parseAddress(input: string): ParsedNetworkInput {
  if (input.includes(':')) {
    return { version: 6, address: parseIpv6Address(input) };
  }
  return { version: 4, address: parseIpv4Address(input) };
}

function addressBits(version: 4 | 6) {
  return version === 4 ? IPV4_BITS : IPV6_BITS;
}

function addressMask(version: 4 | 6, prefix: number) {
  const bits = addressBits(version);
  if (prefix < 0 || prefix > Number(bits)) {
    throw new Error(`Invalid /${prefix} prefix.`);
  }
  if (prefix === 0) {
    return ZERO;
  }
  return ((ONE << bits) - ONE) ^ ((ONE << (bits - BigInt(prefix))) - ONE);
}

function hostBits(version: 4 | 6, prefix: number) {
  return Number(addressBits(version) - BigInt(prefix));
}

function wildcardMask(version: 4 | 6, prefix: number) {
  const bits = addressBits(version);
  return ((ONE << bits) - ONE) ^ addressMask(version, prefix);
}

function formatAddress(version: 4 | 6, value: bigint) {
  return version === 4 ? formatIpv4Address(value) : formatIpv6Address(value);
}

function binaryString(version: 4 | 6, value: bigint) {
  const width = version === 4 ? 32 : 128;
  const raw = value.toString(2).padStart(width, '0');
  const chunk = version === 4 ? 8 : 16;
  return raw.match(new RegExp(`.{1,${chunk}}`, 'g'))?.join(' ') || raw;
}

function reverseDnsZone(version: 4 | 6, network: bigint, prefix: number) {
  if (version === 4) {
    const octets = formatIpv4Address(network).split('.');
    const labels = Math.floor(prefix / 8);
    return `${octets.slice(0, labels).reverse().join('.')}${labels ? '.' : ''}in-addr.arpa`;
  }
  const expanded = expandIpv6(formatIpv6Address(network)).join('');
  const nibbles = Math.floor(prefix / 4);
  return `${expanded.slice(0, nibbles).split('').reverse().join('.')}${nibbles ? '.' : ''}ip6.arpa`;
}

function subnetSplitSuggestions(version: 4 | 6, network: bigint, prefix: number) {
  const maxBits = Number(addressBits(version));
  if (prefix >= maxBits) {
    return [];
  }
  const nextPrefix = prefix + 1;
  const subnetSize = ONE << BigInt(maxBits - nextPrefix);
  return [
    `${formatAddress(version, network)}/${nextPrefix}`,
    `${formatAddress(version, network + subnetSize)}/${nextPrefix}`,
  ];
}

function formatHostCount(version: 4 | 6, prefix: number) {
  const bits = hostBits(version, prefix);
  if (bits === 0) return '1';
  if (bits >= 63) return `2^${bits}`;
  const total = BigInt(2) ** BigInt(bits);
  if (version === 4 && prefix < 31) {
    return (total - BigInt(2)).toString();
  }
  return total.toString();
}

export function prefixFromMask(mask: string) {
  const value = parseIpv4Address(mask);
  const bits = value.toString(2).padStart(32, '0');
  if (!/^1*0*$/.test(bits)) {
    throw new Error('Subnet mask must be contiguous.');
  }
  return bits.indexOf('0') === -1 ? 32 : bits.indexOf('0');
}

export function analyzeCidr(input: string) {
  const [addressPart, prefixPart] = input.trim().split('/');
  if (!addressPart || prefixPart === undefined) {
    throw new Error('CIDR must use address/prefix notation.');
  }
  const parsed = parseAddress(addressPart);
  const prefix = Number(prefixPart);
  if (!Number.isInteger(prefix)) {
    throw new Error('CIDR prefix must be an integer.');
  }
  const bits = Number(addressBits(parsed.version));
  if (prefix < 0 || prefix > bits) {
    throw new Error(`CIDR prefix must be between 0 and ${bits}.`);
  }

  const mask = addressMask(parsed.version, prefix);
  const network = parsed.address & mask;
  const broadcast = parsed.version === 4 ? network + wildcardMask(4, prefix) : null;
  const hostCount = formatHostCount(parsed.version, prefix);
  const firstHost =
    parsed.version === 4 && prefix < 31 ? network + ONE : network;
  const lastHost =
    parsed.version === 4 && broadcast !== null && prefix < 31 ? broadcast - ONE : (broadcast ?? (network + wildcardMask(6, prefix)));

  return {
    version: parsed.version,
    prefix,
    network: formatAddress(parsed.version, network),
    broadcast: broadcast === null ? undefined : formatAddress(4, broadcast),
    firstHost: formatAddress(parsed.version, firstHost),
    lastHost: formatAddress(parsed.version, lastHost),
    subnetMask: formatAddress(parsed.version, mask),
    wildcard: formatAddress(parsed.version, wildcardMask(parsed.version, prefix)),
    hostCount,
    rangeStart: formatAddress(parsed.version, network),
    rangeEnd: formatAddress(parsed.version, broadcast ?? (network + wildcardMask(6, prefix))),
    reverseZone: reverseDnsZone(parsed.version, network, prefix),
    binaryAddress: binaryString(parsed.version, parsed.address),
    binaryMask: binaryString(parsed.version, mask),
    splitSuggestions: subnetSplitSuggestions(parsed.version, network, prefix),
  };
}

export function analyzeSubnet(address: string, maskOrPrefix: string) {
  const parsed = parseAddress(address.trim());
  const prefix = maskOrPrefix.trim().startsWith('/')
    ? Number(maskOrPrefix.trim().slice(1))
    : parsed.version === 4
      ? prefixFromMask(maskOrPrefix.trim())
      : (() => {
          throw new Error('IPv6 subnet input requires prefix notation such as /64.');
        })();
  return analyzeCidr(`${address.trim()}/${prefix}`);
}
