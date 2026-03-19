/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://xbhaczfazhmxntxtakct.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to NannyElite – confirm your email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NannyElite" width="48" height="48" style={{ marginBottom: '16px' }} />
        <Heading style={h1}>Welcome to NannyElite! 🎉</Heading>
        <Text style={text}>
          Thanks for joining{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          ! We're excited to have you.
        </Text>
        
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) by clicking the button below:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm Email
        </Button>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f9f8f6', fontFamily: "'Inter', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '32px', borderRadius: '8px', maxWidth: '480px', margin: '40px auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a2233', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#1a2744', textDecoration: 'underline' }
const button = { backgroundColor: '#1a2744', color: '#ffffff', fontSize: '14px', fontWeight: '600' as const, borderRadius: '9999px', padding: '12px 24px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }
