const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Token não configurado' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { type, amount, description, payer } = body;

    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valor inválido' }),
      };
    }

    if (type === 'pix') {
      const paymentData = {
        transaction_amount: Number(amount),
        description: description || 'Pedido Lanchão Caraguá',
        payment_method_id: 'pix',
        payer: {
          email: payer.email,
          first_name: payer.name?.split(' ')[0] || 'Cliente',
          last_name: payer.name?.split(' ')[1] || '',
        },
      };

      const response = await axios.post(
        'https://api.mercadopago.com/v1/payments',
        paymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = response.data;
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          qr_code: data.point_of_interaction?.transaction_data?.qr_code,
          qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
          ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
        }),
      };
    }

    if (type === 'card') {
      // Aqui você implementa a criação de pagamento com cartão via API direta
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Método cartão ainda não implementado com esta versão' }),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Método de pagamento inválido' }),
    };
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.response?.data?.message || error.message }),
    };
  }
};
