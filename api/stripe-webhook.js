import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).end(); return }
  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    return res.status(400).json({ error: e.message })
  }

  const { type, data } = event

  if (type === 'checkout.session.completed') {
    const userId = data.object.metadata?.userId
    const customerId = data.object.customer
    const subscriptionId = data.object.subscription
    if (userId) {
      await supabase.from('profiles').update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
        trial_ends_at: null,
      }).eq('id', userId)
    }
  }

  if (type === 'customer.subscription.deleted' || type === 'invoice.payment_failed') {
    const customerId = data.object.customer
    await supabase.from('profiles')
      .update({ subscription_status: 'inactive' })
      .eq('stripe_customer_id', customerId)
  }

  if (type === 'invoice.payment_succeeded') {
    const customerId = data.object.customer
    await supabase.from('profiles')
      .update({ subscription_status: 'active' })
      .eq('stripe_customer_id', customerId)
  }

  res.status(200).json({ received: true })
}
