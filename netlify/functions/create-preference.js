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
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Token do Mercado Pago não configurado' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { items, payer, external_reference } = body;

    if (!items || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Carrinho vazio' }),
      };
    }

    // Monta a preferência conforme API do Mercado Pago
    const preference = {
      items: items.map(item => ({
        title: item.title,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        currency_id: 'BRL',
      })),
      payer: {
        name: payer?.name || 'Cliente',
        email: payer?.email || 'cliente@email.com',
      },
      back_urls: {
        success: `${process.env.URL || 'https://' + event.headers.host}/?status=success`,
        failure: `${process.env.URL || 'https://' + event.headers.host}/?status=failure`,
        pending: `${process.env.URL || 'https://' + event.headers.host}/?status=pending`,
      },
      auto_return: 'approved',
      external_reference: external_reference || `pedido_${Date.now()}`,
      notification_url: `${process.env.URL || 'https://' + event.headers.host}/api/webhook`, // opcional
    };

    const response = await axios.post(
      'https://api.mercadopago.com/checkout/preferences',
      preference,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ init_point: response.data.init_point }),
    };
  } catch (error) {
    console.error('Erro:', error.response?.data || error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data?.message || error.message,
        details: error.response?.data || 'Erro interno',
      }),
    };
  }
};
