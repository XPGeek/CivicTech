import { Row, Heading, SmartLink, Logo } from '@once-ui-system/core';

export default function Header() {
  return (
    <Row
      as="header"
      role="banner"
      fillWidth
      paddingX="24"
      paddingY="12"
      vertical="center"
      horizontal="between"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        backdropFilter: 'saturate(180%) blur(14px)',
        WebkitBackdropFilter: 'saturate(180%) blur(14px)',
        background: 'var(--surface-background)',
        borderBottom: '1px solid var(--neutral-border-medium)',
      }}
    >
      <SmartLink href="/" unstyled>
        <Row vertical="center" gap="8">
          <Logo size="s" icon="/icon.svg" href="/" />
          <Heading variant="heading-strong-s">DMV Water Watch</Heading>
        </Row>
      </SmartLink>
      <Row gap="20" vertical="center" s={{ hide: true }}>
        <SmartLink href="/methodology">Methodology</SmartLink>
        <SmartLink href="/sources">Sources</SmartLink>
        <SmartLink href="/about">About</SmartLink>
      </Row>
    </Row>
  );
}
