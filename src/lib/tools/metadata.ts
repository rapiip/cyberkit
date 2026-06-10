import type { ToolDefinition } from './types';

export type ToolMetadata = Omit<ToolDefinition, 'execute'>;

export const allToolMetadata = [
  {
    "id": "url-analyzer",
    "slug": "url-analyzer",
    "name": "URL Analyzer",
    "category": "web-security",
    "description": "Parse and analyze URL components including protocol, hostname, port, path, query parameters, and fragment. Detects potential security issues in URLs.",
    "shortDescription": "Parse and analyze URL components",
    "tags": [
      "url",
      "parse",
      "analyze",
      "web",
      "security"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": true,
    "inputs": [
      {
        "id": "url",
        "label": "URL",
        "type": "url",
        "placeholder": "https://example.com/path?key=value#section",
        "required": true
      }
    ]
  },
  {
    "id": "csp-generator",
    "slug": "csp-generator",
    "name": "CSP Generator",
    "category": "web-security",
    "description": "Generate Content Security Policy headers with a visual builder. Select allowed sources for scripts, styles, images, and other resources.",
    "shortDescription": "Build Content Security Policy headers",
    "tags": [
      "csp",
      "content-security-policy",
      "header",
      "security",
      "xss"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "defaultSrc",
        "label": "default-src",
        "type": "text",
        "placeholder": "'self'",
        "defaultValue": "'self'"
      },
      {
        "id": "scriptSrc",
        "label": "script-src",
        "type": "text",
        "placeholder": "'self' https://cdn.example.com",
        "defaultValue": "'self'"
      },
      {
        "id": "styleSrc",
        "label": "style-src",
        "type": "text",
        "placeholder": "'self' 'unsafe-inline'",
        "defaultValue": "'self' 'unsafe-inline'"
      },
      {
        "id": "imgSrc",
        "label": "img-src",
        "type": "text",
        "placeholder": "'self' data: https:",
        "defaultValue": "'self' data:"
      },
      {
        "id": "fontSrc",
        "label": "font-src",
        "type": "text",
        "placeholder": "'self' https://fonts.gstatic.com",
        "defaultValue": "'self'"
      },
      {
        "id": "connectSrc",
        "label": "connect-src",
        "type": "text",
        "placeholder": "'self'",
        "defaultValue": "'self'"
      },
      {
        "id": "frameSrc",
        "label": "frame-src",
        "type": "text",
        "placeholder": "'none'",
        "defaultValue": "'none'"
      },
      {
        "id": "objectSrc",
        "label": "object-src",
        "type": "text",
        "placeholder": "'none'",
        "defaultValue": "'none'"
      },
      {
        "id": "upgradeInsecure",
        "label": "Upgrade Insecure Requests",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "id": "blockMixed",
        "label": "Block All Mixed Content",
        "type": "checkbox",
        "defaultValue": true
      }
    ]
  },
  {
    "id": "http-header-checker",
    "slug": "http-header-checker",
    "name": "HTTP Header Checker",
    "category": "web-security",
    "description": "Analyze HTTP headers of any website in real-time. Detects active response headers, evaluates missing security headers, and scores overall safety configuration.",
    "shortDescription": "Audit response and security headers",
    "tags": [
      "headers",
      "http",
      "security-headers",
      "audit",
      "csp"
    ],
    "difficulty": "intermediate",
    "executionType": "server",
    "isFeatured": true,
    "inputs": [
      {
        "id": "url",
        "label": "URL or Hostname",
        "type": "text",
        "placeholder": "e.g., github.com",
        "required": true
      }
    ]
  },
  {
    "id": "ssl-checker",
    "slug": "ssl-checker",
    "name": "SSL/TLS Cryptographic Auditor",
    "category": "web-security",
    "description": "Inspect a server's active SSL/TLS configuration, certificate attributes, negotiated protocol version, and cryptographic cipher. Evaluates trust, cipher safety, signature strength, and overall compliance.",
    "shortDescription": "Audit SSL/TLS certificate and connection security",
    "tags": [
      "ssl",
      "tls",
      "certificate",
      "https",
      "expiry",
      "audit",
      "cryptography"
    ],
    "difficulty": "intermediate",
    "executionType": "server",
    "isFeatured": true,
    "inputs": [
      {
        "id": "hostname",
        "label": "Hostname or URL",
        "type": "text",
        "placeholder": "e.g., google.com",
        "required": true
      }
    ]
  },
  {
    "id": "cors-checker",
    "slug": "cors-checker",
    "name": "CORS Policy Checker",
    "category": "web-security",
    "description": "Evaluate Cross-Origin Resource Sharing configuration of a target URL. Probes reflected origins, wildcards, credentials support, and checks for potential hijacking flaws.",
    "shortDescription": "Audit CORS policy configurations",
    "tags": [
      "cors",
      "origin",
      "credentials",
      "api",
      "vulnerability"
    ],
    "difficulty": "intermediate",
    "executionType": "server",
    "isFeatured": false,
    "inputs": [
      {
        "id": "url",
        "label": "Target URL",
        "type": "text",
        "placeholder": "e.g., https://api.github.com",
        "required": true
      }
    ]
  },
  {
    "id": "robots-txt-viewer",
    "slug": "robots-txt-viewer",
    "name": "robots.txt Viewer",
    "category": "web-security",
    "description": "Download and view the robots.txt file of any website to reveal hidden administration directories, crawl rules, sitemaps, and bot instructions.",
    "shortDescription": "Fetch and view robots.txt crawl rules",
    "tags": [
      "robots",
      "crawl",
      "admin",
      "sitemap",
      "recon"
    ],
    "difficulty": "beginner",
    "executionType": "server",
    "isFeatured": false,
    "inputs": [
      {
        "id": "url",
        "label": "Website URL",
        "type": "text",
        "placeholder": "e.g., google.com",
        "required": true
      }
    ]
  },
  {
    "id": "security-txt-checker",
    "slug": "security-txt-checker",
    "name": "security.txt Checker",
    "category": "web-security",
    "description": "Probe a domain for the presence of a security.txt file (RFC 9116) at standard paths. Parses security contact info, encryption keys, and policy guidelines.",
    "shortDescription": "Fetch and parse security.txt contact info",
    "tags": [
      "security.txt",
      "rfc9116",
      "contact",
      "vulnerability",
      "disclosure"
    ],
    "difficulty": "beginner",
    "executionType": "server",
    "isFeatured": false,
    "inputs": [
      {
        "id": "url",
        "label": "Domain or URL",
        "type": "text",
        "placeholder": "e.g., google.com",
        "required": true
      }
    ]
  },
  {
    "id": "dns-lookup",
    "slug": "dns-lookup",
    "name": "DNS Lookup",
    "category": "dns",
    "description": "Perform real-time DNS queries against a target domain. Retrieves active A, AAAA, MX, TXT, NS, CNAME, and Reverse DNS (PTR) records directly from authoritive servers.",
    "shortDescription": "Lookup active DNS records",
    "tags": [
      "dns",
      "lookup",
      "records",
      "domain",
      "mx",
      "txt"
    ],
    "difficulty": "beginner",
    "executionType": "server",
    "isFeatured": true,
    "inputs": [
      {
        "id": "hostname",
        "label": "Domain or IP Address",
        "type": "text",
        "placeholder": "e.g., google.com or 8.8.8.8",
        "required": true
      }
    ]
  },
  {
    "id": "dns-over-https",
    "slug": "dns-over-https",
    "name": "DNS over HTTPS Lookup",
    "category": "dns",
    "description": "Query Google Public DNS over HTTPS with DNSSEC validation details. Useful when you want resolver output from a public DoH API instead of the local server resolver.",
    "shortDescription": "Query Google Public DNS DoH records",
    "tags": [
      "dns",
      "doh",
      "google",
      "dnssec",
      "records"
    ],
    "difficulty": "beginner",
    "executionType": "server",
    "isFeatured": false,
    "inputs": [
      {
        "id": "hostname",
        "label": "Domain Name",
        "type": "text",
        "placeholder": "e.g., example.com",
        "required": true
      },
      {
        "id": "type",
        "label": "Record Type",
        "type": "select",
        "defaultValue": "",
        "options": [
          {
            "label": "All common records",
            "value": ""
          },
          {
            "label": "A",
            "value": "A"
          },
          {
            "label": "AAAA",
            "value": "AAAA"
          },
          {
            "label": "MX",
            "value": "MX"
          },
          {
            "label": "TXT",
            "value": "TXT"
          },
          {
            "label": "NS",
            "value": "NS"
          },
          {
            "label": "CNAME",
            "value": "CNAME"
          },
          {
            "label": "CAA",
            "value": "CAA"
          }
        ]
      }
    ]
  },
  {
    "id": "whois-lookup",
    "slug": "whois-lookup",
    "name": "RDAP / WHOIS Domain Lookup",
    "category": "dns",
    "description": "Query RDAP registration data to retrieve registrar, domain status, event dates, name servers, and raw registration metadata.",
    "shortDescription": "Query RDAP domain registration details",
    "tags": [
      "rdap",
      "whois",
      "registrar",
      "domain",
      "expiry",
      "owner"
    ],
    "difficulty": "beginner",
    "executionType": "server",
    "isFeatured": false,
    "inputs": [
      {
        "id": "hostname",
        "label": "Domain Name",
        "type": "text",
        "placeholder": "e.g., example.com",
        "required": true
      }
    ]
  },
  {
    "id": "cidr-calculator",
    "slug": "cidr-calculator",
    "name": "CIDR Calculator",
    "category": "network",
    "description": "Calculate IP address ranges, subnet masks, and host counts from CIDR notation. Supports both IPv4 CIDR blocks.",
    "shortDescription": "Calculate IP ranges from CIDR notation",
    "tags": [
      "cidr",
      "ip",
      "subnet",
      "network",
      "range"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "cidr",
        "label": "CIDR Block",
        "type": "text",
        "placeholder": "192.168.1.0/24",
        "required": true
      }
    ]
  },
  {
    "id": "subnet-calculator",
    "slug": "subnet-calculator",
    "name": "Subnet Calculator",
    "category": "network",
    "description": "Calculate subnet information from an IP address and subnet mask or prefix length. Determine network address, broadcast, usable range, and wildcard mask.",
    "shortDescription": "Calculate subnet details from IP and mask",
    "tags": [
      "subnet",
      "ip",
      "mask",
      "network",
      "wildcard"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "ip",
        "label": "IP Address",
        "type": "text",
        "placeholder": "192.168.1.100",
        "required": true
      },
      {
        "id": "mask",
        "label": "Subnet Mask or Prefix",
        "type": "text",
        "placeholder": "255.255.255.0 or /24",
        "required": true
      }
    ]
  },
  {
    "id": "common-ports",
    "slug": "common-ports",
    "name": "Common Port Reference",
    "category": "network",
    "description": "Quick reference for common network ports and their associated services. Search by port number or service name.",
    "shortDescription": "Reference guide for common network ports",
    "tags": [
      "port",
      "tcp",
      "udp",
      "service",
      "reference",
      "network"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "search",
        "label": "Search Port or Service",
        "type": "text",
        "placeholder": "e.g., 443, ssh, http...",
        "helperText": "Leave empty to show all common ports"
      }
    ]
  },
  {
    "id": "ip-lookup",
    "slug": "ip-lookup",
    "name": "IP Geolocation & ASN Lookup",
    "category": "network",
    "description": "Lookup detailed geographical location, timezone, ISP, organization, and ASN routing info for any IPv4/IPv6 address or domain.",
    "shortDescription": "Locate and identify IP/domain routing",
    "tags": [
      "ip",
      "geolocation",
      "geo",
      "isp",
      "asn",
      "network"
    ],
    "difficulty": "beginner",
    "executionType": "server",
    "isFeatured": true,
    "inputs": [
      {
        "id": "ipOrDomain",
        "label": "IP Address or Domain",
        "type": "text",
        "placeholder": "e.g., 8.8.8.8 or google.com",
        "required": true
      }
    ]
  },
  {
    "id": "base64",
    "slug": "base64",
    "name": "Base64 Encoder/Decoder",
    "category": "encoding",
    "description": "Encode text to Base64 format or decode Base64 strings back to plain text. Base64 is commonly used in data transmission, email encoding, and embedding binary data in text-based formats like JSON and XML.",
    "shortDescription": "Encode and decode Base64 strings",
    "tags": [
      "base64",
      "encode",
      "decode",
      "encoding",
      "ctf"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": true,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter text to encode or Base64 to decode...",
        "required": true
      },
      {
        "id": "mode",
        "label": "Mode",
        "type": "select",
        "defaultValue": "encode",
        "options": [
          {
            "label": "Encode",
            "value": "encode"
          },
          {
            "label": "Decode",
            "value": "decode"
          }
        ]
      }
    ]
  },
  {
    "id": "url-encoder",
    "slug": "url-encoder",
    "name": "URL Encoder/Decoder",
    "category": "encoding",
    "description": "Encode special characters in URLs using percent-encoding or decode percent-encoded URLs back to readable text. Essential for handling query parameters and special characters in web development.",
    "shortDescription": "Encode and decode URL components",
    "tags": [
      "url",
      "encode",
      "decode",
      "percent-encoding",
      "web"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter URL or text to encode/decode...",
        "required": true
      },
      {
        "id": "mode",
        "label": "Mode",
        "type": "select",
        "defaultValue": "encode",
        "options": [
          {
            "label": "Encode",
            "value": "encode"
          },
          {
            "label": "Decode",
            "value": "decode"
          },
          {
            "label": "Encode Component",
            "value": "encodeComponent"
          },
          {
            "label": "Decode Component",
            "value": "decodeComponent"
          }
        ]
      }
    ]
  },
  {
    "id": "html-entity",
    "slug": "html-entity",
    "name": "HTML Entity Encoder/Decoder",
    "category": "encoding",
    "description": "Convert special HTML characters to their entity equivalents or decode HTML entities back to readable characters. Important for XSS prevention and proper HTML rendering.",
    "shortDescription": "Encode and decode HTML entities",
    "tags": [
      "html",
      "entity",
      "encode",
      "decode",
      "xss"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter HTML or text...",
        "required": true
      },
      {
        "id": "mode",
        "label": "Mode",
        "type": "select",
        "defaultValue": "encode",
        "options": [
          {
            "label": "Encode",
            "value": "encode"
          },
          {
            "label": "Decode",
            "value": "decode"
          }
        ]
      }
    ]
  },
  {
    "id": "hex-converter",
    "slug": "hex-converter",
    "name": "Hex Encoder/Decoder",
    "category": "encoding",
    "description": "Convert text to hexadecimal representation or decode hex strings back to text. Commonly used in binary analysis, cryptography, and low-level data inspection.",
    "shortDescription": "Convert between text and hexadecimal",
    "tags": [
      "hex",
      "hexadecimal",
      "encode",
      "decode",
      "binary"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter text or hex string...",
        "required": true
      },
      {
        "id": "mode",
        "label": "Mode",
        "type": "select",
        "defaultValue": "encode",
        "options": [
          {
            "label": "Text → Hex",
            "value": "encode"
          },
          {
            "label": "Hex → Text",
            "value": "decode"
          }
        ]
      },
      {
        "id": "separator",
        "label": "Separator",
        "type": "select",
        "defaultValue": " ",
        "options": [
          {
            "label": "Space",
            "value": " "
          },
          {
            "label": "None",
            "value": ""
          },
          {
            "label": "Colon",
            "value": ":"
          },
          {
            "label": "0x prefix",
            "value": "0x"
          }
        ]
      }
    ]
  },
  {
    "id": "binary-converter",
    "slug": "binary-converter",
    "name": "Binary Encoder/Decoder",
    "category": "encoding",
    "description": "Convert text to binary (8-bit) representation or decode binary strings back to text. Useful for understanding data at the bit level.",
    "shortDescription": "Convert between text and binary",
    "tags": [
      "binary",
      "encode",
      "decode",
      "bits",
      "ctf"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter text or binary string...",
        "required": true
      },
      {
        "id": "mode",
        "label": "Mode",
        "type": "select",
        "defaultValue": "encode",
        "options": [
          {
            "label": "Text → Binary",
            "value": "encode"
          },
          {
            "label": "Binary → Text",
            "value": "decode"
          }
        ]
      }
    ]
  },
  {
    "id": "unicode-converter",
    "slug": "unicode-converter",
    "name": "Unicode Converter",
    "category": "encoding",
    "description": "Convert text to Unicode code points (U+XXXX format) or convert code points back to text characters.",
    "shortDescription": "Convert between text and Unicode code points",
    "tags": [
      "unicode",
      "codepoint",
      "utf",
      "convert"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter text or Unicode code points (U+0041)...",
        "required": true
      },
      {
        "id": "mode",
        "label": "Mode",
        "type": "select",
        "defaultValue": "encode",
        "options": [
          {
            "label": "Text → Unicode",
            "value": "encode"
          },
          {
            "label": "Unicode → Text",
            "value": "decode"
          }
        ]
      }
    ]
  },
  {
    "id": "rot13",
    "slug": "rot13",
    "name": "ROT13",
    "category": "encoding",
    "description": "Apply ROT13 substitution cipher which rotates each letter 13 positions in the alphabet. ROT13 is its own inverse — applying it twice returns the original text. Commonly used in CTF challenges.",
    "shortDescription": "ROT13 substitution cipher",
    "tags": [
      "rot13",
      "cipher",
      "ctf",
      "substitution",
      "rotate"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter text to apply ROT13...",
        "required": true
      }
    ]
  },
  {
    "id": "caesar-cipher",
    "slug": "caesar-cipher",
    "name": "Caesar Cipher",
    "category": "encoding",
    "description": "Encrypt or decrypt text using the Caesar cipher with a configurable shift value. The Caesar cipher is one of the oldest known ciphers, shifting each letter by a fixed number of positions.",
    "shortDescription": "Caesar cipher with variable shift",
    "tags": [
      "caesar",
      "cipher",
      "shift",
      "ctf",
      "encrypt",
      "decrypt"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter text...",
        "required": true
      },
      {
        "id": "shift",
        "label": "Shift",
        "type": "number",
        "defaultValue": 3,
        "helperText": "Number of positions to shift (1-25)"
      },
      {
        "id": "mode",
        "label": "Mode",
        "type": "select",
        "defaultValue": "encrypt",
        "options": [
          {
            "label": "Encrypt",
            "value": "encrypt"
          },
          {
            "label": "Decrypt",
            "value": "decrypt"
          },
          {
            "label": "Brute Force All",
            "value": "bruteforce"
          }
        ]
      }
    ]
  },
  {
    "id": "jwt-decoder",
    "slug": "jwt-decoder",
    "name": "JWT Decoder",
    "category": "encoding",
    "description": "Decode and inspect JSON Web Tokens (JWT). View the header, payload, and signature. Check expiration time and claims. Does not verify signatures.",
    "shortDescription": "Decode and inspect JWT tokens",
    "tags": [
      "jwt",
      "token",
      "decode",
      "json",
      "auth",
      "bearer"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": true,
    "inputs": [
      {
        "id": "token",
        "label": "JWT Token",
        "type": "textarea",
        "placeholder": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "required": true
      }
    ]
  },
  {
    "id": "morse-code",
    "slug": "morse-code",
    "name": "Morse Code Translator",
    "category": "ctf",
    "description": "Convert text to Morse code or decode Morse code back to text. Uses dots (.) and dashes (-) with space-separated characters and slash-separated words.",
    "shortDescription": "Encode and decode Morse code",
    "tags": [
      "morse",
      "code",
      "ctf",
      "dots",
      "dashes"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter text or Morse code (.- / -...)...",
        "required": true
      },
      {
        "id": "mode",
        "label": "Mode",
        "type": "select",
        "defaultValue": "encode",
        "options": [
          {
            "label": "Text → Morse",
            "value": "encode"
          },
          {
            "label": "Morse → Text",
            "value": "decode"
          }
        ]
      }
    ]
  },
  {
    "id": "md5-generator",
    "slug": "md5-generator",
    "name": "MD5 Generator",
    "category": "hashing",
    "description": "Generate MD5 hash from text input. MD5 produces a 128-bit hash value. Note: MD5 is considered cryptographically broken and should not be used for security purposes.",
    "shortDescription": "Generate MD5 hash from text",
    "tags": [
      "md5",
      "hash",
      "checksum",
      "digest"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input Text",
        "type": "textarea",
        "placeholder": "Enter text to hash...",
        "required": true
      }
    ]
  },
  {
    "id": "sha1-generator",
    "slug": "sha1-generator",
    "name": "SHA-1 Generator",
    "category": "hashing",
    "description": "Generate SHA-1 hash from text input. SHA-1 produces a 160-bit hash value. Note: SHA-1 is considered weak for cryptographic purposes.",
    "shortDescription": "Generate SHA-1 hash from text",
    "tags": [
      "sha1",
      "sha-1",
      "hash",
      "digest"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input Text",
        "type": "textarea",
        "placeholder": "Enter text to hash...",
        "required": true
      }
    ]
  },
  {
    "id": "sha256-generator",
    "slug": "sha256-generator",
    "name": "SHA-256 Generator",
    "category": "hashing",
    "description": "Generate SHA-256 hash from text input. SHA-256 is part of the SHA-2 family and produces a 256-bit hash value. It is widely used in security applications and protocols.",
    "shortDescription": "Generate SHA-256 hash from text",
    "tags": [
      "sha256",
      "sha-256",
      "hash",
      "sha2",
      "digest"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": true,
    "inputs": [
      {
        "id": "input",
        "label": "Input Text",
        "type": "textarea",
        "placeholder": "Enter text to hash...",
        "required": true
      }
    ]
  },
  {
    "id": "sha512-generator",
    "slug": "sha512-generator",
    "name": "SHA-512 Generator",
    "category": "hashing",
    "description": "Generate SHA-512 hash from text input. SHA-512 is part of the SHA-2 family and produces a 512-bit hash value, offering strong collision resistance.",
    "shortDescription": "Generate SHA-512 hash from text",
    "tags": [
      "sha512",
      "sha-512",
      "hash",
      "sha2",
      "digest"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input Text",
        "type": "textarea",
        "placeholder": "Enter text to hash...",
        "required": true
      }
    ]
  },
  {
    "id": "hmac-generator",
    "slug": "hmac-generator",
    "name": "HMAC Generator",
    "category": "hashing",
    "description": "Generate Hash-based Message Authentication Code (HMAC) using a secret key. Supports SHA-256 and SHA-512 algorithms.",
    "shortDescription": "Generate HMAC with a secret key",
    "tags": [
      "hmac",
      "hash",
      "mac",
      "authentication",
      "sha256"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "message",
        "label": "Message",
        "type": "textarea",
        "placeholder": "Enter message...",
        "required": true
      },
      {
        "id": "key",
        "label": "Secret Key",
        "type": "text",
        "placeholder": "Enter secret key...",
        "required": true
      },
      {
        "id": "algorithm",
        "label": "Algorithm",
        "type": "select",
        "defaultValue": "SHA-256",
        "options": [
          {
            "label": "SHA-256",
            "value": "SHA-256"
          },
          {
            "label": "SHA-512",
            "value": "SHA-512"
          }
        ]
      }
    ]
  },
  {
    "id": "uuid-generator",
    "slug": "uuid-generator",
    "name": "UUID Generator",
    "category": "hashing",
    "description": "Generate random UUID v4 (Universally Unique Identifier). Generate single or multiple UUIDs with various format options.",
    "shortDescription": "Generate random UUID v4",
    "tags": [
      "uuid",
      "guid",
      "random",
      "unique",
      "identifier"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "count",
        "label": "Count",
        "type": "number",
        "defaultValue": 1,
        "helperText": "Number of UUIDs (1-100)"
      },
      {
        "id": "uppercase",
        "label": "Uppercase",
        "type": "checkbox",
        "defaultValue": false
      },
      {
        "id": "noDashes",
        "label": "No Dashes",
        "type": "checkbox",
        "defaultValue": false
      }
    ]
  },
  {
    "id": "password-generator",
    "slug": "password-generator",
    "name": "Password Generator",
    "category": "hashing",
    "description": "Generate cryptographically secure random passwords with customizable length and character sets.",
    "shortDescription": "Generate secure random passwords",
    "tags": [
      "password",
      "random",
      "secure",
      "generator"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": true,
    "inputs": [
      {
        "id": "length",
        "label": "Length",
        "type": "number",
        "defaultValue": 16,
        "helperText": "Password length (8-128)"
      },
      {
        "id": "count",
        "label": "Count",
        "type": "number",
        "defaultValue": 5,
        "helperText": "Number of passwords (1-20)"
      },
      {
        "id": "uppercase",
        "label": "Include Uppercase (A-Z)",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "id": "lowercase",
        "label": "Include Lowercase (a-z)",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "id": "numbers",
        "label": "Include Numbers (0-9)",
        "type": "checkbox",
        "defaultValue": true
      },
      {
        "id": "symbols",
        "label": "Include Symbols (!@#$...)",
        "type": "checkbox",
        "defaultValue": true
      }
    ]
  },
  {
    "id": "password-strength",
    "slug": "password-strength",
    "name": "Password Strength Checker",
    "category": "hashing",
    "description": "Analyze password strength based on length, character diversity, patterns, and entropy. Provides a security score and recommendations.",
    "shortDescription": "Check password strength and entropy",
    "tags": [
      "password",
      "strength",
      "security",
      "entropy",
      "audit"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "password",
        "label": "Password",
        "type": "text",
        "placeholder": "Enter password to analyze...",
        "required": true
      }
    ]
  },
  {
    "id": "pwned-password",
    "slug": "pwned-password",
    "name": "Pwned Password Checker",
    "category": "hashing",
    "description": "Check whether a password appears in the Have I Been Pwned Pwned Passwords corpus using k-anonymity. The plain password is hashed in the browser; CyberKit sends only the first 5 SHA-1 hash characters to HIBP.",
    "shortDescription": "Check password exposure via HIBP range API",
    "tags": [
      "password",
      "pwned",
      "hibp",
      "breach",
      "leak",
      "k-anonymity"
    ],
    "difficulty": "beginner",
    "executionType": "server",
    "isFeatured": true,
    "inputs": [
      {
        "id": "password",
        "label": "Password",
        "type": "text",
        "placeholder": "Enter password to check...",
        "required": true,
        "helperText": "The password is SHA-1 hashed in your browser. Only the hash prefix and suffix are sent to CyberKit."
      }
    ]
  },
  {
    "id": "hash-identifier",
    "slug": "hash-identifier",
    "name": "Hash Identifier",
    "category": "hashing",
    "description": "Identify the type of a hash based on its format, length, and character set. Supports MD5, SHA-1, SHA-256, SHA-512, bcrypt, and more.",
    "shortDescription": "Identify hash algorithm from hash string",
    "tags": [
      "hash",
      "identify",
      "detect",
      "algorithm",
      "ctf"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "hash",
        "label": "Hash",
        "type": "text",
        "placeholder": "Enter hash to identify...",
        "required": true
      }
    ]
  },
  {
    "id": "file-hash",
    "slug": "file-hash",
    "name": "File Hash Calculator",
    "category": "hashing",
    "description": "Calculate cryptographic hashes (MD5, SHA-1, SHA-256, SHA-512) of uploaded files. Useful for verifying file integrity and detecting modifications.",
    "shortDescription": "Calculate hash checksums for files",
    "tags": [
      "file",
      "hash",
      "checksum",
      "sha256",
      "integrity"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "file",
        "label": "File",
        "type": "file",
        "required": true
      }
    ]
  },
  {
    "id": "random-string",
    "slug": "random-string",
    "name": "Random String Generator",
    "category": "hashing",
    "description": "Generate random strings with configurable length and character sets. Useful for API keys, tokens, and test data.",
    "shortDescription": "Generate random strings and tokens",
    "tags": [
      "random",
      "string",
      "token",
      "key",
      "generator"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "length",
        "label": "Length",
        "type": "number",
        "defaultValue": 32
      },
      {
        "id": "count",
        "label": "Count",
        "type": "number",
        "defaultValue": 5
      },
      {
        "id": "charset",
        "label": "Character Set",
        "type": "select",
        "defaultValue": "alphanumeric",
        "options": [
          {
            "label": "Alphanumeric",
            "value": "alphanumeric"
          },
          {
            "label": "Hex",
            "value": "hex"
          },
          {
            "label": "Alphabetic",
            "value": "alpha"
          },
          {
            "label": "Numeric",
            "value": "numeric"
          },
          {
            "label": "All printable",
            "value": "all"
          }
        ]
      }
    ]
  },
  {
    "id": "exif-viewer",
    "slug": "exif-viewer",
    "name": "EXIF Metadata Viewer",
    "category": "forensics",
    "description": "Extract and view EXIF metadata from image files including camera info, GPS, timestamps.",
    "shortDescription": "Extract EXIF metadata from images",
    "tags": [
      "exif",
      "metadata",
      "image",
      "gps",
      "forensics"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "file",
        "label": "Image File",
        "type": "file",
        "required": true
      }
    ]
  },
  {
    "id": "mime-checker",
    "slug": "mime-checker",
    "name": "MIME Type Checker",
    "category": "forensics",
    "description": "Check file MIME type based on content and extension. Detect mismatches.",
    "shortDescription": "Check and verify file MIME types",
    "tags": [
      "mime",
      "type",
      "file",
      "forensics"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "file",
        "label": "File",
        "type": "file",
        "required": true
      }
    ]
  },
  {
    "id": "magic-bytes",
    "slug": "magic-bytes",
    "name": "Magic Bytes Viewer",
    "category": "forensics",
    "description": "View hex dump of file header bytes to identify true file type.",
    "shortDescription": "View file magic bytes",
    "tags": [
      "magic",
      "bytes",
      "hex",
      "forensics"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "file",
        "label": "File",
        "type": "file",
        "required": true
      },
      {
        "id": "byteCount",
        "label": "Bytes to Show",
        "type": "number",
        "defaultValue": 64
      }
    ]
  },
  {
    "id": "string-extractor",
    "slug": "string-extractor",
    "name": "String Extractor",
    "category": "forensics",
    "description": "Extract readable ASCII strings from binary files, like Unix strings command.",
    "shortDescription": "Extract strings from binary files",
    "tags": [
      "strings",
      "extract",
      "binary",
      "forensics"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "file",
        "label": "File",
        "type": "file",
        "required": true
      },
      {
        "id": "minLength",
        "label": "Min String Length",
        "type": "number",
        "defaultValue": 4
      }
    ]
  },
  {
    "id": "ioc-extractor",
    "slug": "ioc-extractor",
    "name": "IOC Extractor",
    "category": "forensics",
    "description": "Extract Indicators of Compromise from text: IPs, domains, URLs, emails, hashes.",
    "shortDescription": "Extract IOCs from text/logs",
    "tags": [
      "ioc",
      "indicator",
      "threat",
      "ip",
      "hash"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Text / Logs",
        "type": "textarea",
        "placeholder": "Paste logs or text...",
        "required": true
      }
    ]
  },
  {
    "id": "email-format",
    "slug": "email-format",
    "name": "Email Format Checker",
    "category": "osint",
    "description": "Validate email address format and extract components. Check for common disposable email providers.",
    "shortDescription": "Validate and analyze email addresses",
    "tags": [
      "email",
      "validate",
      "format",
      "osint"
    ],
    "difficulty": "beginner",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "email",
        "label": "Email Address",
        "type": "text",
        "placeholder": "user@example.com",
        "required": true
      }
    ]
  },
  {
    "id": "github-secret",
    "slug": "github-secret",
    "name": "GitHub Secret Pattern Checker",
    "category": "osint",
    "description": "Scan text for common secret patterns like API keys, tokens, passwords, and credentials that should not be in code.",
    "shortDescription": "Detect secrets and API keys in code",
    "tags": [
      "github",
      "secret",
      "api-key",
      "token",
      "leak",
      "security"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Code / Text",
        "type": "textarea",
        "placeholder": "Paste code to scan for secrets...",
        "required": true
      }
    ]
  },
  {
    "id": "cve-lookup",
    "slug": "cve-lookup",
    "name": "CVE & KEV Lookup",
    "category": "osint",
    "description": "Search the NVD CVE API and enrich matching vulnerabilities with CISA Known Exploited Vulnerabilities (KEV) catalog data when available.",
    "shortDescription": "Search CVEs and known exploited status",
    "tags": [
      "cve",
      "nvd",
      "cisa",
      "kev",
      "vulnerability",
      "exploit"
    ],
    "difficulty": "intermediate",
    "executionType": "server",
    "isFeatured": true,
    "inputs": [
      {
        "id": "query",
        "label": "CVE ID or Keyword",
        "type": "text",
        "placeholder": "e.g., CVE-2021-44228 or Microsoft Exchange",
        "required": true
      },
      {
        "id": "severity",
        "label": "Severity Filter",
        "type": "select",
        "defaultValue": "",
        "options": [
          {
            "label": "Any severity",
            "value": ""
          },
          {
            "label": "Critical only",
            "value": "CRITICAL"
          },
          {
            "label": "High only",
            "value": "HIGH"
          },
          {
            "label": "Medium only",
            "value": "MEDIUM"
          },
          {
            "label": "Low only",
            "value": "LOW"
          }
        ]
      },
      {
        "id": "kevOnly",
        "label": "Known Exploited (CISA KEV) only",
        "type": "checkbox",
        "defaultValue": false
      },
      {
        "id": "ransomwareOnly",
        "label": "Known ransomware campaign use only",
        "type": "checkbox",
        "defaultValue": false
      },
      {
        "id": "resultsPerPage",
        "label": "Results Per Page",
        "type": "number",
        "defaultValue": 10,
        "helperText": "1-50 results per request"
      },
      {
        "id": "startIndex",
        "label": "Start Index",
        "type": "number",
        "defaultValue": 0,
        "helperText": "Use the Next Start Index item to load the next page"
      }
    ]
  },
  {
    "id": "xor-helper",
    "slug": "xor-helper",
    "name": "XOR Helper",
    "category": "ctf",
    "description": "XOR text or hex data with a key. Supports single-byte and multi-byte XOR operations common in CTF challenges.",
    "shortDescription": "XOR encode/decode data with a key",
    "tags": [
      "xor",
      "cipher",
      "ctf",
      "crypto",
      "key"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "input",
        "label": "Input",
        "type": "textarea",
        "placeholder": "Enter text or hex...",
        "required": true
      },
      {
        "id": "key",
        "label": "XOR Key",
        "type": "text",
        "placeholder": "Key (text or hex like 0x41)",
        "required": true
      },
      {
        "id": "inputFormat",
        "label": "Input Format",
        "type": "select",
        "defaultValue": "text",
        "options": [
          {
            "label": "Text",
            "value": "text"
          },
          {
            "label": "Hex",
            "value": "hex"
          }
        ]
      },
      {
        "id": "outputFormat",
        "label": "Output Format",
        "type": "select",
        "defaultValue": "text",
        "options": [
          {
            "label": "Text",
            "value": "text"
          },
          {
            "label": "Hex",
            "value": "hex"
          }
        ]
      }
    ]
  },
  {
    "id": "regex-tester",
    "slug": "regex-tester",
    "name": "Regex Tester",
    "category": "ctf",
    "description": "Test regular expressions against input text. View matches, groups, and match positions in real-time.",
    "shortDescription": "Test and debug regular expressions",
    "tags": [
      "regex",
      "regexp",
      "pattern",
      "test",
      "match"
    ],
    "difficulty": "intermediate",
    "executionType": "client",
    "isFeatured": false,
    "inputs": [
      {
        "id": "pattern",
        "label": "Regex Pattern",
        "type": "text",
        "placeholder": "\\b[A-Z]\\w+",
        "required": true
      },
      {
        "id": "flags",
        "label": "Flags",
        "type": "text",
        "placeholder": "gi",
        "defaultValue": "g"
      },
      {
        "id": "input",
        "label": "Test String",
        "type": "textarea",
        "placeholder": "Enter text to test against...",
        "required": true
      }
    ]
  }
] satisfies ToolMetadata[];

export function getToolMetadataBySlug(slug: string): ToolMetadata | undefined {
  return allToolMetadata.find((tool) => tool.slug === slug);
}

export function getToolMetadataByCategory(category: string): ToolMetadata[] {
  return allToolMetadata.filter((tool) => tool.category === category);
}

export function getFeaturedToolMetadata(): ToolMetadata[] {
  return allToolMetadata.filter((tool) => tool.isFeatured);
}

export function searchToolMetadata(query: string): ToolMetadata[] {
  const q = query.toLowerCase().trim();
  if (!q) return allToolMetadata;
  return allToolMetadata.filter(
    (tool) =>
      tool.name.toLowerCase().includes(q) ||
      tool.shortDescription.toLowerCase().includes(q) ||
      tool.tags.some((tag) => tag.includes(q)) ||
      tool.category.includes(q)
  );
}
