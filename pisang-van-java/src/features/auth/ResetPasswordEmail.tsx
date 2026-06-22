import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text
} from '@react-email/components'

interface ResetPasswordEmailProps {
  customerName: string
  resetLink: string
}

export const ResetPasswordEmail = ({ customerName, resetLink }: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Atur Ulang Kata Sandi Akun Pisang Van Java Anda</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Pisang Van Java</Heading>
          <Text style={text}>
            Halo <strong>{customerName}</strong>,
          </Text>
          <Text style={text}>
            Kami menerima permintaan untuk mengatur ulang kata sandi akun Pisang Van Java Anda.
            Silakan klik tombol di bawah ini untuk mengganti kata sandi Anda:
          </Text>

          <Section style={btnContainer}>
            <Button style={button} href={resetLink}>
              Atur Ulang Kata Sandi
            </Button>
          </Section>

          <Text style={text}>
            Tautan ini hanya berlaku selama <strong>15 menit</strong>. Jika Anda tidak merasa
            membuat permintaan ini, abaikan email ini dan kata sandi Anda tidak akan berubah.
          </Text>

          <Hr style={hr} />

          <Text style={smallText}>
            Jika tombol di atas tidak berfungsi, Anda juga dapat menyalin dan membuka tautan berikut
            di browser Anda:
            <br />
            <Link href={resetLink} style={link}>
              {resetLink}
            </Link>
          </Text>

          <Text style={footer}>
            Salam hangat,
            <br />
            <strong>Pisang Van Java Team</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles matching OrderConfirmationEmail design system
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif'
}

const container = { margin: '0 auto', padding: '20px 0 48px', width: '580px' }

const h1 = {
  color: '#d97706',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0'
}

const text = { color: '#333', fontSize: '16px', lineHeight: '24px', marginBottom: '16px' }

const btnContainer = { textAlign: 'center' as const, margin: '24px 0' }

const button = {
  backgroundColor: '#d97706',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
  fontWeight: 'bold'
}

const hr = { borderColor: '#e5e7eb', margin: '24px 0' }

const smallText = { color: '#666', fontSize: '14px', lineHeight: '20px' }

const link = { color: '#d97706', textDecoration: 'underline' }

const footer = { color: '#898989', fontSize: '14px', lineHeight: '22px', marginTop: '32px' }

export default ResetPasswordEmail
