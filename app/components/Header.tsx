import { Row, Text } from '@once-ui-system/core';
import Link from 'next/link';

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '/methodology', label: 'Methodology' },
  { href: '/sources', label: 'Sources' },
  { href: '/about', label: 'About' },
];

export default function Header() {
  return (
    <Row
      as="header"
      fillWidth
      horizontal="center"
      role="banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'saturate(180%) blur(10px)',
        WebkitBackdropFilter: 'saturate(180%) blur(10px)',
        background: 'var(--surface-background-alpha-strong, rgba(255,255,255,0.85))',
        borderBottom: '1px solid var(--neutral-alpha-weak, rgba(15,23,42,0.08))',
      }}
    >
      <Row
        fillWidth
        maxWidth={64}
        paddingX="20"
        paddingY="12"
        vertical="center"
        gap="16"
      >
        <Link href="/" style={{ textDecoration: 'none' }} aria-label="DMV Water Watch — home">
          <Row gap="8" vertical="center">
            <span
              aria-hidden
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                boxShadow: '0 0 0 3px rgba(16,185,129,0.18)',
              }}
            />
            <Text variant="label-strong-m" onBackground="neutral-strong">
              DMV Water Watch
            </Text>
          </Row>
        </Link>
        <Row gap="20" vertical="center" style={{ marginLeft: 'auto' }}>
          {NAV_LINKS.map((n) => (
            <Link key={n.href} href={n.href} style={{ textDecoration: 'none' }}>
              <Text
                variant="body-default-s"
                onBackground="neutral-medium"
                className="header-link"
              >
                {n.label}
              </Text>
            </Link>
          ))}
        </Row>
      </Row>
    </Row>
  );
}
