const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) throw new Error('Token não configurado');

    const client = new MercadoPagoConfig({ accessToken });
    const body = JSON.parse(event.body || '{}');
    const { type, amount, description, payer, paymentMethodId, token, installments, issuerId } = body;

    if (!amount || amount <= 0) throw new Error('Valor inválido');

    // 1. Pagamento via Pix
    if (type === 'pix') {
      const paymentData = {
        body: {
          transaction_amount: Number(amount),
          description: description || 'Pedido Lanchão Caraguá',
          payment_method_id: 'pix',
          payer: {
            email: payer.email,
            first_name: payer.first_name || payer.name?.split(' ')[0],
            last_name: payer.last_name || payer.name?.split(' ')[1] || '',
            identification: payer.identification || { type: 'CPF', number: '00000000000' }
          }
        }
      };
      const paymentClient = new Payment(client);
      const response = await paymentClient.create(paymentData);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: response.status,
          point_of_interaction: response.point_of_interaction,
          qr_code: response.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: response.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: response.point_of_interaction?.transaction_data?.ticket_url,
          payment_id: response.id
        })
      };
    }

    // 2. Pagamento com Cartão (Crédito/Débito)
    if (type === 'card') {
      if (!token || !paymentMethodId) throw new Error('Dados de cartão incompletos');

      const paymentData = {
        body: {
          transaction_amount: Number(amount),
          description: description || 'Pedido Lanchão Caraguá',
          payment_method_id: paymentMethodId,
          issuer_id: issuerId,
          installments: installments || 1,
          token: token,
          payer: {
            email: payer.email,
            first_name: payer.first_name || payer.name?.split(' ')[0],
            last_name: payer.last_name || payer.name?.split(' ')[1] || '',
            identification: payer.identification || { type: 'CPF', number: '00000000000' }
          }
        }
      };
      const paymentClient = new Payment(client);
      const response = await paymentClient.create(paymentData);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: response.status,
          id: response.id,
          status_detail: response.status_detail
        })
      };
    }

    throw new Error('Método de pagamento inválido');
  } catch (error) {
    console.error('Erro:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Erro interno' })
    };
  }
};
