/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://xbhaczfazhmxntxtakct.supabase.co/storage/v1/object/public/email-assets/logo.png'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NannyElite" width="48" height="48" style={{ marginBottom: '16px' }} />
        <Heading style={h1}>Confirm your identity</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>This code will expire shortly. If you didn't request this, you can safely ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f9f8f6', fontFamily: "'Inter', Arial, sans-serif" }
const container = { backgroundColor: '#ffffff', padding: '32px', borderRadius: '8px', maxWidth: '480px', margin: '40px auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a2233', margin: '0 0 20px', fontFamily: "'Playfair Display', Georgia, serif" }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#1a2744', margin: '0 0 30px', letterSpacing: '4px' }
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }
