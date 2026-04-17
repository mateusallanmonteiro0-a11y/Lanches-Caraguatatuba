const { MercadoPagoConfig, Preference } = require('mercadopago');

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
      console.error('MP_ACCESS_TOKEN não configurado');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Token do Mercado Pago não configurado no servidor' }),
      };
    }

    // Inicializa o cliente (nova forma)
    const client = new MercadoPagoConfig({ accessToken });
    const preferenceClient = new Preference(client);

    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (err) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Corpo da requisição inválido' }),
      };
    }

    const { items, payer, metadata, external_reference } = body;

    if (!items || items.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Carrinho vazio' }),
      };
    }

    // Monta a preferência conforme documentação v2
    const preferenceData = {
      items: items.map((item) => ({
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
        success: `${process.env.URL || 'https://' + event.headers.host}/?pagamento=sucesso`,
        failure: `${process.env.URL || 'https://' + event.headers.host}/?pagamento=falha`,
        pending: `${process.env.URL || 'https://' + event.headers.host}/?pagamento=pending`,
      },
      auto_return: 'approved',
      external_reference: external_reference || `pedido_${Date.now()}`,
      metadata: metadata || {},
    };

    const response = await preferenceClient.create({ body: preferenceData });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ init_point: response.init_point }),
    };
  } catch (error) {
    console.error('Erro no Mercado Pago:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Erro interno ao criar preferência' }),
    };
  }
};
