import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const closedBy = formData.get('closedBy') as string

    if (!file || !closedBy) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    await resend.emails.send({
      from: 'Licorería App <onboarding@resend.dev>',
      to: process.env.REPORT_EMAIL!,
      subject: '📊 Cierre de turno',
      html: `<p>El turno fue cerrado por <b>${closedBy}</b></p>`,
      attachments: [
        {
          filename: 'cierre_turno.xlsx',
          content: buffer,
        },
      ],
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('ERROR RESEND:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
