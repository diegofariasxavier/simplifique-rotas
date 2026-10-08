const APP = Object.freeze({
  VERSION: '1.10.1',
  PLANILHA_ID: '1wAA9H2jRBsPvWRNvh_1Fkk_Hbr8jV8atZ_z_gvI3uGY',
  TZ: 'America/Sao_Paulo',
  SESSION_TTL: 21600,
  MAX_IMPORT_ROWS: 10000,
  SENHA_VEICULO_PADRAO: '123456',
  ABAS: Object.freeze({
    PAINEL: 'PAINEL_ROTEIRIZADOR',
    CONFIG: 'CONFIG',
    VEICULOS: 'VEICULOS',
    ROTAS: 'ROTAS',
    ENTREGAS: 'ENTREGAS',
    PEDIDOS: 'PEDIDOS',
    EVENTOS: 'EVENTOS',
    IMPORTACOES: 'IMPORTACOES',
    MOTIVOS: 'MOTIVOS',
    USUARIOS: 'USUARIOS'
  }),
  STATUS_ROTA: Object.freeze({
    AGUARDANDO: 'AGUARDANDO_LIBERACAO',
    LIBERADA: 'LIBERADA',
    SAINDO: 'SAINDO_CD',
    EM_ROTA: 'EM_ROTA',
    VOLTANDO: 'VOLTANDO_CD',
    CHEGADA: 'CHEGADA_CD'
  }),
  STATUS_ENTREGA: Object.freeze({
    PENDENTE: 'PENDENTE',
    A_CAMINHO: 'A_CAMINHO',
    NO_CLIENTE: 'NO_CLIENTE',
    ENTREGUE: 'ENTREGA_REALIZADA',
    RETORNO: 'RETORNO_REGISTRADO'
  }),
  CABECALHOS: Object.freeze({
    PAINEL_ROTEIRIZADOR: ['INDICADOR', 'VALOR', 'ATUALIZADO_EM'],
    CONFIG: ['CHAVE', 'VALOR', 'DESCRIÇÃO'],
    VEICULOS: ['VEICULO_ID', 'VEICULO', 'PLACA', 'MOTORISTA_PADRAO', 'SENHA', 'ATIVO', 'OBSERVAÇÃO'],
    ROTAS: ['ROTA_ID', 'DATA_IMPORTACAO', 'DTFATURAMENTO_BASE', 'DATA_SUGERIDA', 'DATA_OPERACIONAL', 'VEICULO', 'PLACA', 'TURNO', 'CARREGAMENTO', 'TIPO_OPERACAO', 'LOJA_OPERACAO', 'GRUPO_PARADA_ID', 'STATUS_ROTA', 'MOTORISTA_CONFIRMADO', 'MOTORISTA_REAL', 'LIBERADA_EM', 'SAIDA_EM', 'RETORNO_CD_EM', 'FINALIZADA_EM', 'OBSERVAÇÃO'],
    ENTREGAS: ['ENTREGA_ID', 'ROTA_ID', 'VEICULO', 'CARREGAMENTO', 'TURNO', 'CLIENTE', 'CODIGO_CLIENTE', 'ENDERECO_COMPLETO', 'BAIRRO', 'CIDADE', 'UF', 'CEP', 'TELEFONE', 'QTDE_PEDIDOS', 'PEDIDOS', 'PEDIDOS_ANTIGOS', 'ORDEM_MANUAL', 'STATUS_ENTREGA', 'ETAPA_ATUAL', 'MOTIVO_RETORNO', 'CHEGADA_CLIENTE_EM', 'FINALIZADA_EM', 'RETORNO_REGISTRADO_EM', 'SELECIONADA_EM'],
    PEDIDOS: ['Código', 'Cliente', 'TELENT', 'Pedido', 'DTEmissao', 'DTFaturamento', 'Vendedor(a)', 'Motorista', 'Veiculo', 'Carregamento', 'TOTPESO', 'Filial', 'HORAFECHA', 'CODCOB', 'VLTOTAL', 'MINUTOFECHA', 'Tipo Entrega', 'Endereço Entrega', 'Número', 'Complemento', 'Bairro', 'Cidade', 'UF', 'CEP', 'Ponto Referência', 'Telefone Entrega', 'IMPORTACAO_ID', 'ROTA_ID', 'ENTREGA_ID', 'TIPO_PEDIDO', 'DATA_SUGERIDA', 'DATA_OPERACIONAL', 'STATUS_PEDIDO', 'MOTIVO_RETORNO', 'TENTATIVA_ATUAL'],
    EVENTOS: ['EVENTO_ID', 'DATA_HORA', 'ROTA_ID', 'ENTREGA_ID', 'VEICULO', 'MOTORISTA', 'ETAPA', 'AÇÃO', 'DETALHE', 'USUARIO', 'ORIGEM'],
    IMPORTACOES: ['IMPORTACAO_ID', 'DATA_HORA', 'ARQUIVO', 'USUARIO', 'LINHAS_LIDAS', 'LINHAS_VALIDAS', 'LINHAS_PENDENTES', 'STATUS', 'OBSERVAÇÃO'],
    MOTIVOS: ['MOTIVO_ID', 'MOTIVO', 'ATIVO'],
    USUARIOS: ['USUARIO', 'NOME', 'PERFIL', 'SENHA_HASH', 'SALT', 'ATIVO', 'CRIADO_EM', 'ULTIMO_ACESSO']
  })
});

const BASE_COLUNAS = Object.freeze([
  'Código', 'Cliente', 'TELENT', 'Pedido', 'DTEmissao', 'DTFaturamento', 'Vendedor(a)',
  'Motorista', 'Veiculo', 'Carregamento', 'TOTPESO', 'Filial', 'HORAFECHA', 'CODCOB',
  'VLTOTAL', 'MINUTOFECHA', 'Tipo Entrega', 'Endereço Entrega', 'Número', 'Complemento',
  'Bairro', 'Cidade', 'UF', 'CEP', 'Ponto Referência', 'Telefone Entrega'
]);

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setTitle('Rota Simples | Simplifique Home Center');
}

function setupInicial() {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = abrirPlanilha_();
    Object.keys(APP.CABECALHOS).forEach(function (nome) {
      garantirAba_(ss, nome, APP.CABECALHOS[nome]);
    });

    garantirConfig_('SENHA_PADRAO', APP.SENHA_VEICULO_PADRAO, 'Senha inicial de todos os veículos');
    garantirConfig_('INTERVALO_ATUALIZACAO_SEG', '15', 'Atualização automática do painel e da visão do motorista a cada 15 segundos');
    garantirConfig_('LOGO_ATIVA', 'EMBED_HTML', 'Logo incorporada ao Index.html; não usa Script Properties');
    garantirConfig_('REGRA_DATA', 'DTFaturamento + 1 dia; sexta pode ir para sábado ou segunda', 'Data operacional confirmada pelo roteirizador');
    garantirConfig_('REGRA_ANTIGOS', 'Pedidos já existentes nunca são recriados pela importação', 'Nova tentativa deve ser uma ação deliberada da Central');
    garantirConfig_('REGRA_IMPORTACAO', 'Chave permanente = Filial + Pedido', 'Importação incremental: somente pedidos realmente novos entram na base');
    garantirConfig_('TIPOS_OPERACAO', 'ENTREGA_CLIENTE|COLETA_LOJA_CD|ENTREGA_LOJA', 'Tipo definido por carregamento inteiro na revisão da rota');
    garantirConfig_('REGRA_PARADAS', 'Coleta/Entrega Loja na mesma loja = 1 parada; Entrega Cliente com mesmo cliente + endereço na mesma jornada = 1 parada automática', 'Carregamentos originais permanecem preservados para auditoria');
    garantirConfig_('REGRA_LIBERACAO_MASSA', 'Seleção liberada como uma única jornada por veículo + data + turno + motorista', 'Permite revisar e liberar vários carregamentos de uma vez sem perder a rastreabilidade individual');
    garantirConfig_('VERSAO', APP.VERSION, 'Versão do sistema');

    const motivos = [
      'Cliente ausente', 'Local fechado', 'Endereço não localizado',
      'Cliente recusou a entrega', 'Acesso impedido', 'Problema com o veículo',
      'Solicitação da central'
    ];
    const shMotivos = ss.getSheetByName(APP.ABAS.MOTIVOS);
    if (shMotivos.getLastRow() < 2) {
      shMotivos.getRange(2, 1, motivos.length, 3).setValues(
        motivos.map(function (m, i) { return [i + 1, m, 'SIM']; })
      );
    }

    garantirUsuarioInicial_();
    atualizarPainel_();
    formatarEstrutura_(ss);

    return {
      ok: true,
      versao: APP.VERSION,
      planilha: ss.getName(),
      abas: ss.getSheets().map(function (s) { return s.getName(); }),
      usuarioInicial: 'diego',
      senhaInicialCriadaSomenteSeUsuarioNovo: true
    };
  } finally {
    lock.releaseLock();
  }
}

function diagnosticoSistema() {
  const ss = abrirPlanilha_();
  const faltantes = [];
  Object.keys(APP.CABECALHOS).forEach(function (nome) {
    if (!ss.getSheetByName(nome)) faltantes.push(nome);
  });
  const usuarios = ss.getSheetByName(APP.ABAS.USUARIOS);
  const veiculos = ss.getSheetByName(APP.ABAS.VEICULOS);
  const colunasFaltantes = {};
  Object.keys(APP.CABECALHOS).forEach(function (nome) {
    const sh = ss.getSheetByName(nome);
    if (!sh) return;
    const headers = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getDisplayValues()[0].map(normalizarHeader_);
    const miss = APP.CABECALHOS[nome].filter(function (h) { return headers.indexOf(normalizarHeader_(h)) === -1; });
    if (miss.length) colunasFaltantes[nome] = miss;
  });
  return {
    ok: faltantes.length === 0 && Object.keys(colunasFaltantes).length === 0,
    versao: APP.VERSION,
    planilhaIdCorreto: ss.getId() === APP.PLANILHA_ID,
    abasFaltantes: faltantes,
    colunasFaltantes: colunasFaltantes,
    usuarios: usuarios ? Math.max(0, usuarios.getLastRow() - 1) : 0,
    veiculos: veiculos ? Math.max(0, veiculos.getLastRow() - 1) : 0,
    timezone: ss.getSpreadsheetTimeZone()
  };
}

function testeInternoLogica() {
  const cab = BASE_COLUNAS;
  const linhas = [
    cab,
    ['101', 'Cliente A', '', 'P1', '01/10/2026', '01/10/2026', 'V1', 'José', '11', 'CARGA-1', '', '', '09:10', '', '', '', 'Entrega', 'Rua Alfa', '10', '', 'Centro', 'Fortaleza', 'CE', '60000-000', '', '85999990001'],
    ['101', 'Cliente A', '', 'P2', '01/10/2026', '01/10/2026', 'V1', 'José', '11', 'CARGA-1', '', '', '09:12', '', '', '', 'Entrega', 'Rua Alfa', '10', '', 'Centro', 'Fortaleza', 'CE', '60000-000', '', '85999990001'],
    ['202', 'Cliente B', '', 'P3', '02/10/2026', '02/10/2026', 'V1', 'José', '26', 'CARGA-2', '', '', '13:20', '', '', '', 'Entrega', 'Rua Beta', '20', '', 'Aldeota', 'Fortaleza', 'CE', '60100-000', '', '85999990002']
  ];
  const p = parseImportacao_(linhas);
  const g1 = p.grupos[0];
  const g2 = p.grupos[1];
  return {
    ok: p.validas.length === 3 &&
      agruparEntregas_(g1.linhas).length === 1 &&
      g1.baseData === '2026-10-01' &&
      g2.baseData === '2026-10-02' &&
      sugerirData_(parseData_('01/10/2026'), {}) === '2026-10-02' &&
      sugerirData_(parseData_('02/10/2026'), {'2026-10-02': 'SEGUNDA'}) === '2026-10-05',
    linhasValidas: p.validas.length,
    entregasGrupo1: agruparEntregas_(g1.linhas).length,
    dataNormal: sugerirData_(parseData_('01/10/2026'), {}),
    sextaSegunda: sugerirData_(parseData_('02/10/2026'), {'2026-10-02': 'SEGUNDA'}),
    sextaSabado: sugerirData_(parseData_('02/10/2026'), {'2026-10-02': 'SABADO'})
  };
}

function listarVeiculosLogin() {
  return consolidarVeiculos_(lerObjetos_(APP.ABAS.VEICULOS))
    .map(function (v) {
      const item = veiculoPublico_(v);
      item.label = rotuloVeiculo_(v);
      return item;
    })
    .sort(function (a, b) { return a.label.localeCompare(b.label, 'pt-BR', { numeric: true }); });
}

function loginCentral(usuario, senha) {
  usuario = normalizarUsuario_(usuario);
  senha = texto_(senha);
  if (!usuario || !senha) throw new Error('Informe usuário e senha.');

  const dados = lerObjetosComLinha_(APP.ABAS.USUARIOS);
  const u = dados.find(function (x) {
    return normalizarUsuario_(x.USUARIO) === usuario && normalizar_(x.ATIVO || 'SIM') !== 'NAO';
  });
  if (!u || !compararSenha_(senha, u.SENHA_HASH, u.SALT)) throw new Error('Usuário ou senha inválidos.');
  if (normalizar_(u.PERFIL) !== 'ROTEIRIZADOR') throw new Error('Este usuário não possui acesso à Central.');

  patchLinha_(APP.ABAS.USUARIOS, u.__linha, { ULTIMO_ACESSO: agora_() });
  const sessao = criarSessao_({
    perfil: 'ROTEIRIZADOR',
    usuario: texto_(u.USUARIO),
    nome: texto_(u.NOME) || texto_(u.USUARIO)
  });
  return { token: sessao.token, perfil: sessao.perfil, data: bootstrapCentral_(sessao) };
}

function loginMotorista(veiculo, senha) {
  veiculo = texto_(veiculo);
  senha = texto_(senha);
  if (!veiculo || !senha) throw new Error('Selecione o veículo e informe a senha.');

  const veiculos = lerObjetos_(APP.ABAS.VEICULOS);
  const v = localizarVeiculo_(veiculos, veiculo);
  if (!v || normalizar_(v.ATIVO || 'SIM') === 'NAO') throw new Error('Veículo não encontrado ou inativo.');

  const senhaEsperada = texto_(v.SENHA) || obterConfig_('SENHA_PADRAO') || APP.SENHA_VEICULO_PADRAO;
  if (senha !== senhaEsperada) throw new Error('Senha do veículo inválida.');

  const sessao = criarSessao_({
    perfil: 'MOTORISTA',
    usuario: texto_(v.VEICULO_ID) || texto_(v.VEICULO),
    nome: texto_(v.VEICULO),
    veiculoId: texto_(v.VEICULO_ID),
    veiculo: texto_(v.VEICULO),
    placa: texto_(v.PLACA)
  });
  return { token: sessao.token, perfil: sessao.perfil, data: bootstrapMotorista_(sessao) };
}

function restaurarSessao(token) {
  const s = obterSessao_(token);
  return {
    token: token,
    perfil: s.perfil,
    data: s.perfil === 'ROTEIRIZADOR' ? bootstrapCentral_(s) : bootstrapMotorista_(s)
  };
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('sessao:' + token);
  return true;
}

function obterBootstrapCentral(token) {
  return bootstrapCentral_(exigirSessao_(token, 'ROTEIRIZADOR'));
}

function obterBootstrapMotorista(token) {
  return bootstrapMotorista_(exigirSessao_(token, 'MOTORISTA'));
}

function analisarImportacao(token, arquivo, linhas) {
  exigirSessao_(token, 'ROTEIRIZADOR');
  validarArquivoExcel_(arquivo);
  const parsed = parseImportacao_(linhas);
  const filtro = filtrarPedidosNovos_(parsed.validas, lerObjetos_(APP.ABAS.PEDIDOS, true));
  const grupos = agruparLinhasImportacao_(filtro.novas);
  const sextas = {};
  grupos.forEach(function (g) {
    const d = parseData_(g.baseData);
    if (d && d.getDay() === 5) sextas[g.baseData] = (sextas[g.baseData] || 0) + g.linhas.length;
  });
  const entregas = grupos.reduce(function (n, g) { return n + agruparEntregas_(g.linhas).length; }, 0);

  return {
    arquivo: texto_(arquivo),
    linhaCabecalho: parsed.headerIndex + 1,
    linhasLidas: parsed.lidas,
    linhasValidas: parsed.validas.length,
    linhasNovas: filtro.novas.length,
    pedidosExistentesIgnorados: filtro.ignorados,
    pedidosEntreguesIgnorados: filtro.entregues,
    pedidosOutrosIgnorados: filtro.outros,
    linhasInvalidas: parsed.invalidas.length,
    gruposRota: grupos.length,
    entregas: entregas,
    sextas: Object.keys(sextas).sort().map(function (data) {
      return { dataFaturamento: data, pedidos: sextas[data] };
    }),
    invalidas: parsed.invalidas.slice(0, 20)
  };
}

function importarLinhas(token, arquivo, linhas, opcoesSexta) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  validarArquivoExcel_(arquivo);
  opcoesSexta = opcoesSexta || {};

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const parsed = parseImportacao_(linhas);
    if (!parsed.validas.length) throw new Error('Nenhuma linha válida foi encontrada no arquivo.');

    const existentesPedidos = lerObjetos_(APP.ABAS.PEDIDOS, true);
    const filtro = filtrarPedidosNovos_(parsed.validas, existentesPedidos);
    const grupos = agruparLinhasImportacao_(filtro.novas);

    grupos.forEach(function (g) {
      const d = parseData_(g.baseData);
      if (d.getDay() === 5) {
        const escolha = normalizar_(opcoesSexta[g.baseData]);
        if (escolha !== 'SABADO' && escolha !== 'SEGUNDA') {
          throw new Error('Escolha sábado ou segunda-feira para o faturamento de ' + dataBr_(g.baseData) + '.');
        }
      }
    });

    const importId = novoId_('I');
    const agora = agora_();
    const existentesRotas = lerObjetosComLinha_(APP.ABAS.ROTAS);
    const existentesEntregas = lerObjetosComLinha_(APP.ABAS.ENTREGAS);
    const veiculos = lerObjetos_(APP.ABAS.VEICULOS);
    const novosVeiculos = [];
    const novasRotas = [];
    const novasEntregas = [];
    const novosPedidos = [];

    grupos.forEach(function (grupo) {
      const dataSugerida = sugerirData_(parseData_(grupo.baseData), opcoesSexta);
      const brutoVeiculo = texto_(grupo.linhas[0].dados.Veiculo);
      const motoristaBase = modaTexto_(grupo.linhas.map(function (x) { return x.dados.Motorista; }));
      let veiculo = localizarVeiculo_(veiculos.concat(novosVeiculos), brutoVeiculo);
      if (!veiculo) {
        veiculo = criarVeiculoImportado_(brutoVeiculo, motoristaBase, importId);
        novosVeiculos.push(veiculo);
      }
      const veiculoNome = texto_(veiculo.VEICULO) || brutoVeiculo;
      const placa = texto_(veiculo.PLACA);
      const carregamento = texto_(grupo.carregamento);
      const turno = inferirTurno_(grupo.linhas);
      const rotaExistente = existentesRotas.find(function (r) {
        return normalizar_(r.STATUS_ROTA) === APP.STATUS_ROTA.AGUARDANDO &&
          veiculosEquivalentes_({ VEICULO: r.VEICULO, PLACA: r.PLACA }, veiculo) &&
          normalizar_(r.CARREGAMENTO) === normalizar_(carregamento) &&
          texto_(r.DATA_OPERACIONAL) === dataSugerida;
      });
      const rotaId = rotaExistente ? texto_(rotaExistente.ROTA_ID) : novoIdRota_(dataSugerida, veiculoNome, carregamento);

      if (!rotaExistente) {
        novasRotas.push({
          ROTA_ID: rotaId,
          DATA_IMPORTACAO: agora,
          DTFATURAMENTO_BASE: grupo.baseData,
          DATA_SUGERIDA: dataSugerida,
          DATA_OPERACIONAL: dataSugerida,
          VEICULO: veiculoNome,
          PLACA: placa,
          TURNO: turno,
          CARREGAMENTO: carregamento,
          TIPO_OPERACAO: 'ENTREGA_CLIENTE',
          LOJA_OPERACAO: '',
          GRUPO_PARADA_ID: '',
          STATUS_ROTA: APP.STATUS_ROTA.AGUARDANDO,
          MOTORISTA_CONFIRMADO: 'PENDENTE',
          MOTORISTA_REAL: motoristaBase,
          LIBERADA_EM: '',
          SAIDA_EM: '',
          RETORNO_CD_EM: '',
          FINALIZADA_EM: '',
          OBSERVAÇÃO: grupo.temAntigos ? 'Contém pedido(s) com faturamento anterior à base do carregamento.' : ''
        });
      }

      const entregasGrupo = agruparEntregas_(grupo.linhas);
      entregasGrupo.forEach(function (eg, idx) {
        let entrega = existentesEntregas.find(function (e) {
          return texto_(e.ROTA_ID) === rotaId &&
            chaveEntregaExistente_(e) === eg.chave &&
            normalizar_(e.STATUS_ENTREGA) === APP.STATUS_ENTREGA.PENDENTE;
        });
        let entregaId;

        if (entrega) {
          entregaId = texto_(entrega.ENTREGA_ID);
          const atuais = listaTexto_(entrega.PEDIDOS);
          const antigosAtuais = listaTexto_(entrega.PEDIDOS_ANTIGOS);
          const novosNums = eg.linhas.map(function (x) { return texto_(x.dados.Pedido); });
          const novosAntigos = eg.linhas.filter(function (x) { return x.dataIso < grupo.baseData; })
            .map(function (x) { return texto_(x.dados.Pedido); });
          patchLinha_(APP.ABAS.ENTREGAS, entrega.__linha, {
            QTDE_PEDIDOS: unicos_(atuais.concat(novosNums)).length,
            PEDIDOS: unicos_(atuais.concat(novosNums)).join(', '),
            PEDIDOS_ANTIGOS: unicos_(antigosAtuais.concat(novosAntigos)).join(', ')
          });
        } else {
          entregaId = novoId_('E');
          const primeiro = eg.linhas[0].dados;
          const antigos = eg.linhas.filter(function (x) { return x.dataIso < grupo.baseData; })
            .map(function (x) { return texto_(x.dados.Pedido); });
          novasEntregas.push({
            ENTREGA_ID: entregaId,
            ROTA_ID: rotaId,
            VEICULO: veiculoNome,
            CARREGAMENTO: carregamento,
            TURNO: turno,
            CLIENTE: texto_(primeiro.Cliente),
            CODIGO_CLIENTE: texto_(primeiro['Código']),
            ENDERECO_COMPLETO: eg.endereco,
            BAIRRO: texto_(primeiro.Bairro),
            CIDADE: texto_(primeiro.Cidade),
            UF: texto_(primeiro.UF),
            CEP: texto_(primeiro.CEP),
            TELEFONE: texto_(primeiro['Telefone Entrega']) || texto_(primeiro.TELENT),
            QTDE_PEDIDOS: eg.linhas.length,
            PEDIDOS: eg.linhas.map(function (x) { return texto_(x.dados.Pedido); }).join(', '),
            PEDIDOS_ANTIGOS: antigos.join(', '),
            ORDEM_MANUAL: idx + 1,
            STATUS_ENTREGA: APP.STATUS_ENTREGA.PENDENTE,
            ETAPA_ATUAL: 'AGUARDANDO_LIBERACAO',
            MOTIVO_RETORNO: '',
            CHEGADA_CLIENTE_EM: '',
            FINALIZADA_EM: '',
            RETORNO_REGISTRADO_EM: ''
          });
        }

        eg.linhas.forEach(function (item) {
          const d = item.dados;
          const obj = {};
          BASE_COLUNAS.forEach(function (c) { obj[c] = texto_(d[c]); });
          obj.IMPORTACAO_ID = importId;
          obj.ROTA_ID = rotaId;
          obj.ENTREGA_ID = entregaId;
          obj.TIPO_PEDIDO = item.dataIso < grupo.baseData ? 'ANTIGO' : 'ATUAL';
          obj.DATA_SUGERIDA = dataSugerida;
          obj.DATA_OPERACIONAL = dataSugerida;
          obj.STATUS_PEDIDO = APP.STATUS_ROTA.AGUARDANDO;
          obj.MOTIVO_RETORNO = '';
          obj.TENTATIVA_ATUAL = 1;
          novosPedidos.push(obj);
        });
      });
    });

    if (novosVeiculos.length) anexarObjetos_(APP.ABAS.VEICULOS, novosVeiculos);
    if (novasRotas.length) anexarObjetos_(APP.ABAS.ROTAS, novasRotas);
    if (novasEntregas.length) anexarObjetos_(APP.ABAS.ENTREGAS, novasEntregas);
    if (novosPedidos.length) anexarObjetos_(APP.ABAS.PEDIDOS, novosPedidos);

    const obs = [];
    if (filtro.ignorados) obs.push(filtro.ignorados + ' pedido(s) já existente(s) ignorado(s)');
    if (filtro.entregues) obs.push(filtro.entregues + ' já entregue(s)');
    anexarObjetos_(APP.ABAS.IMPORTACOES, [{
      IMPORTACAO_ID: importId,
      DATA_HORA: agora,
      ARQUIVO: texto_(arquivo),
      USUARIO: sessao.usuario,
      LINHAS_LIDAS: parsed.lidas,
      LINHAS_VALIDAS: novosPedidos.length,
      LINHAS_PENDENTES: parsed.invalidas.length,
      STATUS: novosPedidos.length ? 'CONCLUIDA' : 'SEM_NOVOS_PEDIDOS',
      OBSERVAÇÃO: obs.join(' • ')
    }]);

    registrarEvento_('', '', '', '', 'IMPORTACAO', 'ARQUIVO_IMPORTADO',
      'Importação ' + importId + ': ' + novosPedidos.length + ' novo(s); ' + filtro.ignorados + ' já existente(s) ignorado(s).', sessao.usuario, 'CENTRAL');
    atualizarPainel_();

    return {
      ok: true,
      importacaoId: importId,
      pedidosImportados: novosPedidos.length,
      pedidosExistentesIgnorados: filtro.ignorados,
      pedidosEntreguesIgnorados: filtro.entregues,
      pedidosOutrosIgnorados: filtro.outros,
      rotasCriadas: novasRotas.length,
      entregasCriadas: novasEntregas.length,
      veiculosCriados: novosVeiculos.length,
      linhasInvalidas: parsed.invalidas.length,
      data: bootstrapCentral_(sessao)
    };
  } finally {
    lock.releaseLock();
  }
}

function salvarRevisaoRota(token, payload) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  payload = payload || {};
  const rotaId = texto_(payload.rotaId);
  if (!rotaId) throw new Error('Rota inválida.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rota = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', rotaId);
    if (!rota) throw new Error('Rota não encontrada.');
    const status = normalizar_(rota.STATUS_ROTA);
    if ([APP.STATUS_ROTA.SAINDO, APP.STATUS_ROTA.EM_ROTA, APP.STATUS_ROTA.VOLTANDO, APP.STATUS_ROTA.CHEGADA].indexOf(status) !== -1) {
      throw new Error('A rota já saiu do CD e não pode mais ser alterada pela revisão.');
    }

    const dataOperacional = dataIsoValidada_(payload.dataOperacional, 'Data operacional');
    const turno = normalizar_(payload.turno);
    if (['MANHA', 'TARDE', 'EXTRA'].indexOf(turno) === -1) throw new Error('Selecione um turno válido.');
    const motorista = texto_(payload.motorista);
    if (!motorista) throw new Error('Informe o motorista.');
    const tipoOperacao = normalizarTipoOperacao_(payload.tipoOperacao || rota.TIPO_OPERACAO);
    const lojaOperacao = texto_(payload.lojaOperacao);
    if (tipoOperacao !== 'ENTREGA_CLIENTE' && !lojaOperacao) {
      throw new Error('Informe a loja para operações de coleta ou entrega em loja.');
    }

    const veiculos = lerObjetos_(APP.ABAS.VEICULOS);
    const veiculo = localizarVeiculo_(veiculos, payload.veiculo);
    if (!veiculo || normalizar_(veiculo.ATIVO || 'SIM') === 'NAO') throw new Error('Selecione um veículo ativo.');

    const novoVeiculo = texto_(veiculo.VEICULO);
    const novaPlaca = texto_(veiculo.PLACA);
    const mudouResponsavel = !veiculosEquivalentes_({ VEICULO: rota.VEICULO, PLACA: rota.PLACA }, veiculo) ||
      normalizar_(motorista) !== normalizar_(rota.MOTORISTA_REAL);
    const novoConfirmado = mudouResponsavel ? 'PENDENTE' : texto_(rota.MOTORISTA_CONFIRMADO);
    const grupoAtual = texto_(rota.GRUPO_PARADA_ID);
    const quebraGrupoEstrutural = !!grupoAtual && (texto_(rota.DATA_OPERACIONAL) !== dataOperacional || !veiculosEquivalentes_({ VEICULO: rota.VEICULO, PLACA: rota.PLACA }, veiculo) || normalizar_(rota.TURNO) !== turno || tipoOperacao !== 'ENTREGA_CLIENTE');

    const rotaPatch = {
      DATA_OPERACIONAL: dataOperacional,
      VEICULO: novoVeiculo,
      PLACA: novaPlaca,
      TURNO: turno,
      TIPO_OPERACAO: tipoOperacao,
      LOJA_OPERACAO: tipoOperacao === 'ENTREGA_CLIENTE' ? '' : lojaOperacao,
      GRUPO_PARADA_ID: quebraGrupoEstrutural ? '' : grupoAtual,
      MOTORISTA_REAL: motorista,
      MOTORISTA_CONFIRMADO: novoConfirmado
    };
    const rotaMudou = texto_(rota.DATA_OPERACIONAL) !== dataOperacional ||
      normalizar_(rota.VEICULO) !== normalizar_(novoVeiculo) ||
      normalizar_(rota.PLACA) !== normalizar_(novaPlaca) ||
      normalizar_(rota.TURNO) !== turno ||
      normalizarTipoOperacao_(rota.TIPO_OPERACAO) !== tipoOperacao ||
      texto_(rota.LOJA_OPERACAO) !== (tipoOperacao === 'ENTREGA_CLIENTE' ? '' : lojaOperacao) ||
      texto_(rota.GRUPO_PARADA_ID) !== rotaPatch.GRUPO_PARADA_ID ||
      normalizar_(rota.MOTORISTA_REAL) !== normalizar_(motorista) ||
      normalizar_(rota.MOTORISTA_CONFIRMADO) !== normalizar_(novoConfirmado);

    const alteracoesEntrega = [];
    const entregas = Array.isArray(payload.entregas) ? payload.entregas : [];
    const atuaisEntregas = lerObjetosPorValorComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', rotaId);
    const mapaEntregas = {};
    atuaisEntregas.forEach(function (x) { mapaEntregas[texto_(x.ENTREGA_ID)] = x; });
    entregas.forEach(function (e) {
      const id = texto_(e.id);
      if (!id) return;
      const atual = mapaEntregas[id];
      if (!atual) return;
      const patch = {
        VEICULO: novoVeiculo,
        TURNO: turno,
        ENDERECO_COMPLETO: texto_(e.endereco),
        TELEFONE: texto_(e.telefone)
      };
      const mudou = normalizar_(atual.VEICULO) !== normalizar_(patch.VEICULO) ||
        normalizar_(atual.TURNO) !== normalizar_(patch.TURNO) ||
        texto_(atual.ENDERECO_COMPLETO) !== patch.ENDERECO_COMPLETO ||
        texto_(atual.TELEFONE) !== patch.TELEFONE;
      if (mudou) alteracoesEntrega.push({ linha: atual.__linha, patch: patch, quebraGrupo: texto_(atual.ENDERECO_COMPLETO) !== patch.ENDERECO_COMPLETO });
    });

    const quebraGrupoEndereco = !!grupoAtual && alteracoesEntrega.some(function (x) { return x.quebraGrupo; });
    if (quebraGrupoEndereco && !quebraGrupoEstrutural) {
      rotaPatch.GRUPO_PARADA_ID = '';
    }
    const rotaMudouFinal = rotaMudou || texto_(rota.GRUPO_PARADA_ID) !== rotaPatch.GRUPO_PARADA_ID;
    if (!rotaMudouFinal && !alteracoesEntrega.length) {
      return respostaCentralRotas_([rotaId], { semAlteracao: true });
    }

    if (rotaMudouFinal) patchLinha_(APP.ABAS.ROTAS, rota.__linha, rotaPatch);
    patchLinhas_(APP.ABAS.ENTREGAS, alteracoesEntrega.map(function (x) { return { linha: x.linha, patch: x.patch }; }));
    if (texto_(rota.DATA_OPERACIONAL) !== dataOperacional) atualizarPedidosDaRota_(rotaId, { DATA_OPERACIONAL: dataOperacional });
    const rotaGrupoAjustada = grupoAtual && !rotaPatch.GRUPO_PARADA_ID ? limparGrupoParadaSolto_(grupoAtual) : '';

    const rotaPersistida = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', rotaId);
    const lojaEsperada = tipoOperacao === 'ENTREGA_CLIENTE' ? '' : lojaOperacao;
    if (!rotaPersistida || normalizarTipoOperacao_(rotaPersistida.TIPO_OPERACAO) !== tipoOperacao || texto_(rotaPersistida.LOJA_OPERACAO) !== lojaEsperada) {
      throw new Error('A revisão não foi persistida corretamente na aba ROTAS. Execute setupInicial() e tente novamente.');
    }

    registrarEvento_(rotaId, '', novoVeiculo, motorista, 'REVISAO', 'ROTA_REVISADA',
      'Dados operacionais revisados pela central.', sessao.usuario, 'CENTRAL');
    return respostaCentralRotas_([rotaId, rotaGrupoAjustada], { semAlteracao: false });
  } finally {
    lock.releaseLock();
  }
}

function liberarRota(token, rotaId) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rota = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', rotaId);
    if (!rota) throw new Error('Rota não encontrada.');
    if (normalizar_(rota.STATUS_ROTA) !== APP.STATUS_ROTA.AGUARDANDO) throw new Error('Esta rota não está aguardando liberação.');
    if (!texto_(rota.VEICULO) || !texto_(rota.DATA_OPERACIONAL) || !texto_(rota.MOTORISTA_REAL)) {
      throw new Error('Revise veículo, data e motorista antes de liberar.');
    }
    const tipoOperacao = normalizarTipoOperacao_(rota.TIPO_OPERACAO);
    if (tipoOperacao !== 'ENTREGA_CLIENTE' && !texto_(rota.LOJA_OPERACAO)) {
      throw new Error('Informe a loja da operação antes de liberar esta rota.');
    }
    const entregas = lerObjetosPorValorComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', rotaId);
    if (!entregas.length) throw new Error('A rota não possui entregas.');
    if (entregas.some(function (e) { return !texto_(e.ENDERECO_COMPLETO); })) throw new Error('Existe entrega sem endereço.');
    const jornadaAtiva = lerObjetos_(APP.ABAS.ROTAS).some(function (x) {
      if (texto_(x.ROTA_ID) === texto_(rotaId)) return false;
      const st = normalizar_(x.STATUS_ROTA);
      return texto_(x.DATA_OPERACIONAL) === texto_(rota.DATA_OPERACIONAL) &&
        veiculosEquivalentes_({ VEICULO: x.VEICULO, PLACA: x.PLACA }, { VEICULO: rota.VEICULO, PLACA: rota.PLACA }) &&
        [APP.STATUS_ROTA.SAINDO, APP.STATUS_ROTA.EM_ROTA, APP.STATUS_ROTA.VOLTANDO].indexOf(st) !== -1;
    });
    if (jornadaAtiva) throw new Error('Este veículo já iniciou a jornada desta data. Não é possível adicionar outro carregamento depois da saída.');

    const agora = agora_();
    patchLinha_(APP.ABAS.ROTAS, rota.__linha, {
      STATUS_ROTA: APP.STATUS_ROTA.LIBERADA,
      MOTORISTA_CONFIRMADO: 'PENDENTE',
      LIBERADA_EM: agora
    });
    atualizarEntregasDaRota_(rotaId, { ETAPA_ATUAL: 'ROTA_LIBERADA' });
    atualizarPedidosDaRota_(rotaId, { STATUS_PEDIDO: APP.STATUS_ROTA.LIBERADA });
    registrarEvento_(rotaId, '', rota.VEICULO, rota.MOTORISTA_REAL, 'LIBERACAO', 'ROTA_LIBERADA',
      'Rota liberada para o veículo.', sessao.usuario, 'CENTRAL');
    return respostaCentralRotas_([rotaId]);
  } finally {
    lock.releaseLock();
  }
}


function limparGrupoParadaSolto_(grupoId) {
  grupoId = texto_(grupoId);
  if (!grupoId) return '';
  const restantes = lerObjetosPorValorComLinha_(APP.ABAS.ROTAS, 'GRUPO_PARADA_ID', grupoId);
  if (restantes.length === 1) {
    patchLinha_(APP.ABAS.ROTAS, restantes[0].__linha, { GRUPO_PARADA_ID: '' });
    return texto_(restantes[0].ROTA_ID);
  }
  return '';
}

function unificarCarregamentos(token, rotaIds) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  rotaIds = unicos_((Array.isArray(rotaIds) ? rotaIds : []).map(texto_).filter(Boolean));
  if (rotaIds.length < 2) throw new Error('Selecione pelo menos dois carregamentos para unificar.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rotas = lerObjetosComLinha_(APP.ABAS.ROTAS);
    const selecionadas = rotaIds.map(function (id) {
      const r = rotas.find(function (x) { return texto_(x.ROTA_ID) === id; });
      if (!r) throw new Error('Uma das rotas selecionadas não foi encontrada.');
      return r;
    });
    selecionadas.forEach(function (r) {
      if (normalizar_(r.STATUS_ROTA) !== APP.STATUS_ROTA.AGUARDANDO) throw new Error('Só é possível unificar carregamentos que ainda aguardam liberação.');
      if (normalizarTipoOperacao_(r.TIPO_OPERACAO) !== 'ENTREGA_CLIENTE') throw new Error('Coleta e Entrega Loja já representam uma única parada por carregamento e não precisam ser unificadas.');
    });

    const base = selecionadas[0];
    if (selecionadas.some(function (r) {
      return texto_(r.DATA_OPERACIONAL) !== texto_(base.DATA_OPERACIONAL) ||
        !veiculosEquivalentes_({ VEICULO: r.VEICULO, PLACA: r.PLACA }, { VEICULO: base.VEICULO, PLACA: base.PLACA }) ||
        normalizar_(r.TURNO) !== normalizar_(base.TURNO);
    })) throw new Error('Para unificar, os carregamentos precisam estar no mesmo veículo, data e turno.');

    const gruposExistentes = unicos_(selecionadas.map(function (r) { return texto_(r.GRUPO_PARADA_ID); }).filter(Boolean));
    gruposExistentes.forEach(function (g) {
      const membros = rotas.filter(function (r) { return texto_(r.GRUPO_PARADA_ID) === g; }).map(function (r) { return texto_(r.ROTA_ID); });
      if (membros.some(function (id) { return rotaIds.indexOf(id) === -1; })) throw new Error('Um carregamento selecionado já pertence a outra unificação. Selecione todos os carregamentos desse grupo antes de refazer a união.');
    });

    const todasEntregas = lerObjetos_(APP.ABAS.ENTREGAS);
    const entregas = selecionadas.map(function (r) {
      const itens = todasEntregas.filter(function (e) { return texto_(e.ROTA_ID) === texto_(r.ROTA_ID); });
      if (itens.length !== 1) throw new Error('Cada carregamento selecionado precisa representar exatamente uma entrega para ser unificado.');
      return itens[0];
    });
    const chave = chaveDestinoUnificacao_(entregas[0]);
    if (!chave || entregas.some(function (e) { return chaveDestinoUnificacao_(e) !== chave; })) {
      throw new Error('Os carregamentos selecionados não possuem o mesmo cliente e endereço. Revise os destinos antes de unificar.');
    }

    const atual = unicos_(selecionadas.map(function (r) { return texto_(r.GRUPO_PARADA_ID); }).filter(Boolean));
    if (atual.length === 1 && selecionadas.every(function (r) { return texto_(r.GRUPO_PARADA_ID) === atual[0]; })) {
      return respostaCentralRotas_(rotaIds, { semAlteracao: true, grupoParadaId: atual[0] });
    }

    const grupoId = novoId_('PG');
    patchLinhas_(APP.ABAS.ROTAS, selecionadas.map(function (r) { return { linha: r.__linha, patch: { GRUPO_PARADA_ID: grupoId } }; }));
    registrarEvento_('', grupoId, base.VEICULO, base.MOTORISTA_REAL, 'PARADA', 'CARREGAMENTOS_UNIFICADOS',
      'Carregamentos ' + selecionadas.map(function (r) { return texto_(r.CARREGAMENTO); }).join(', ') + ' unificados em uma única parada.', sessao.usuario, 'CENTRAL');
    return respostaCentralRotas_(rotaIds, { grupoParadaId: grupoId });
  } finally {
    lock.releaseLock();
  }
}

function desunificarCarregamentos(token, rotaIds) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  rotaIds = unicos_((Array.isArray(rotaIds) ? rotaIds : []).map(texto_).filter(Boolean));
  if (!rotaIds.length) throw new Error('Selecione pelo menos um carregamento.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rotas = lerObjetosComLinha_(APP.ABAS.ROTAS);
    const gruposAfetados = [], updates = [];
    rotaIds.forEach(function (id) {
      const r = rotas.find(function (x) { return texto_(x.ROTA_ID) === id; });
      if (!r) return;
      if (normalizar_(r.STATUS_ROTA) !== APP.STATUS_ROTA.AGUARDANDO) throw new Error('Só é possível desunificar carregamentos antes da liberação.');
      if (texto_(r.GRUPO_PARADA_ID)) gruposAfetados.push(texto_(r.GRUPO_PARADA_ID));
      updates.push({ linha: r.__linha, patch: { GRUPO_PARADA_ID: '' } });
    });
    patchLinhas_(APP.ABAS.ROTAS, updates);
    const extras = [];
    unicos_(gruposAfetados).forEach(function (g) {
      const membros = lerObjetosPorValorComLinha_(APP.ABAS.ROTAS, 'GRUPO_PARADA_ID', g);
      if (membros.length === 1) { patchLinha_(APP.ABAS.ROTAS, membros[0].__linha, { GRUPO_PARADA_ID: '' }); extras.push(texto_(membros[0].ROTA_ID)); }
    });
    registrarEvento_('', '', '', '', 'PARADA', 'CARREGAMENTOS_DESUNIFICADOS', 'Unificação de carregamentos removida.', sessao.usuario, 'CENTRAL');
    return respostaCentralRotas_(rotaIds.concat(extras));
  } finally {
    lock.releaseLock();
  }
}


function revisarLiberarRotasEmMassa(token, payload) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  payload = payload || {};
  const rotaIds = unicos_((Array.isArray(payload.rotaIds) ? payload.rotaIds : []).map(texto_).filter(Boolean));
  if (!rotaIds.length) throw new Error('Selecione pelo menos um carregamento.');

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rotasTodas = lerObjetosComLinha_(APP.ABAS.ROTAS);
    const selecionadas = rotaIds.map(function (id) {
      const r = rotasTodas.find(function (x) { return texto_(x.ROTA_ID) === id; });
      if (!r) throw new Error('Uma das rotas selecionadas não foi encontrada.');
      if (normalizar_(r.STATUS_ROTA) !== APP.STATUS_ROTA.AGUARDANDO) {
        throw new Error('Todos os carregamentos selecionados precisam estar aguardando liberação. Atualize a tela e tente novamente.');
      }
      return r;
    });

    const selecionadasSet = new Set(rotaIds);
    selecionadas.forEach(function (r) {
      const grupo = texto_(r.GRUPO_PARADA_ID);
      if (!grupo) return;
      const membrosPendentes = rotasTodas.filter(function (x) {
        return texto_(x.GRUPO_PARADA_ID) === grupo && normalizar_(x.STATUS_ROTA) === APP.STATUS_ROTA.AGUARDANDO;
      }).map(function (x) { return texto_(x.ROTA_ID); });
      if (membrosPendentes.some(function (id) { return !selecionadasSet.has(id); })) {
        throw new Error('Um carregamento selecionado pertence a uma parada unificada. Selecione todos os carregamentos dessa parada antes de liberar em massa.');
      }
    });

    const veiculos = consolidarVeiculos_(lerObjetos_(APP.ABAS.VEICULOS));
    const veiculoInformado = texto_(payload.veiculo);
    const veiculoOverride = veiculoInformado ? localizarVeiculo_(veiculos, veiculoInformado) : null;
    if (veiculoInformado && (!veiculoOverride || normalizar_(veiculoOverride.ATIVO || 'SIM') === 'NAO')) {
      throw new Error('Selecione um veículo ativo para a liberação em massa.');
    }

    const dataOverride = texto_(payload.dataOperacional) ? dataIsoValidada_(payload.dataOperacional, 'Data operacional') : '';
    const turnoOverride = normalizar_(payload.turno);
    if (turnoOverride && ['MANHA', 'TARDE', 'EXTRA'].indexOf(turnoOverride) === -1) throw new Error('Selecione um turno válido.');
    const motoristaOverride = texto_(payload.motorista);
    const tipoInformado = texto_(payload.tipoOperacao);
    const temTipoOverride = !!tipoInformado;
    const tipoOverride = temTipoOverride ? normalizarTipoOperacao_(tipoInformado) : '';
    const lojaOverride = texto_(payload.lojaOperacao);
    if (temTipoOverride && tipoOverride !== 'ENTREGA_CLIENTE' && !lojaOverride) {
      throw new Error('Informe a loja da operação para aplicar Coleta ou Entrega Loja em massa.');
    }

    const finais = selecionadas.map(function (r) {
      const veiculoAtual = localizarVeiculo_(veiculos, texto_(r.VEICULO) || texto_(r.PLACA));
      const vf = veiculoOverride || veiculoAtual || { VEICULO: texto_(r.VEICULO), PLACA: texto_(r.PLACA) };
      const tipo = temTipoOverride ? tipoOverride : normalizarTipoOperacao_(r.TIPO_OPERACAO);
      const loja = temTipoOverride ? (tipo === 'ENTREGA_CLIENTE' ? '' : lojaOverride) : (tipo === 'ENTREGA_CLIENTE' ? '' : texto_(r.LOJA_OPERACAO));
      const dados = {
        rota: r,
        dataOperacional: dataOverride || texto_(r.DATA_OPERACIONAL),
        turno: turnoOverride || normalizar_(r.TURNO),
        veiculo: texto_(vf.VEICULO) || texto_(r.VEICULO),
        placa: texto_(vf.PLACA) || texto_(r.PLACA),
        motorista: motoristaOverride || texto_(r.MOTORISTA_REAL),
        tipoOperacao: tipo,
        lojaOperacao: loja
      };
      if (!dados.dataOperacional) throw new Error('Existe carregamento sem data operacional. Informe uma data para aplicar em todos.');
      if (['MANHA', 'TARDE', 'EXTRA'].indexOf(dados.turno) === -1) throw new Error('Existe carregamento sem turno válido. Informe um turno para aplicar em todos.');
      if (!dados.veiculo) throw new Error('Existe carregamento sem veículo. Selecione um veículo para aplicar em todos.');
      if (!dados.motorista) throw new Error('Existe carregamento sem motorista. Informe o motorista para aplicar em todos.');
      if (dados.tipoOperacao !== 'ENTREGA_CLIENTE' && !dados.lojaOperacao) throw new Error('Existe operação de loja sem a loja informada.');
      return dados;
    });

    const base = finais[0];
    const mesmaJornada = finais.every(function (x) {
      return x.dataOperacional === base.dataOperacional &&
        x.turno === base.turno &&
        veiculosEquivalentes_({ VEICULO: x.veiculo, PLACA: x.placa }, { VEICULO: base.veiculo, PLACA: base.placa }) &&
        normalizar_(x.motorista) === normalizar_(base.motorista);
    });
    if (!mesmaJornada) {
      throw new Error('Para o motorista receber apenas uma jornada, todos os selecionados precisam terminar com o mesmo veículo, data, turno e motorista. Preencha os campos em massa para padronizar a seleção.');
    }

    const jornadaAtiva = rotasTodas.some(function (x) {
      if (selecionadasSet.has(texto_(x.ROTA_ID))) return false;
      const st = normalizar_(x.STATUS_ROTA);
      return texto_(x.DATA_OPERACIONAL) === base.dataOperacional &&
        normalizar_(x.TURNO) === base.turno &&
        veiculosEquivalentes_({ VEICULO: x.VEICULO, PLACA: x.PLACA }, { VEICULO: base.veiculo, PLACA: base.placa }) &&
        [APP.STATUS_ROTA.SAINDO, APP.STATUS_ROTA.EM_ROTA, APP.STATUS_ROTA.VOLTANDO].indexOf(st) !== -1;
    });
    if (jornadaAtiva) throw new Error('Este veículo já iniciou a jornada desta data e turno. Não é possível acrescentar carregamentos depois da saída.');

    const todasEntregas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', rotaIds);
    finais.forEach(function (x) {
      const itens = todasEntregas.filter(function (e) { return texto_(e.ROTA_ID) === texto_(x.rota.ROTA_ID); });
      if (!itens.length) throw new Error('O carregamento ' + texto_(x.rota.CARREGAMENTO) + ' não possui entregas.');
      if (x.tipoOperacao === 'ENTREGA_CLIENTE' && itens.some(function (e) { return !texto_(e.ENDERECO_COMPLETO); })) {
        throw new Error('O carregamento ' + texto_(x.rota.CARREGAMENTO) + ' possui entrega sem endereço.');
      }
    });

    const agora = agora_();
    const gruposParaLimpar = [], rotaUpdates = [], entregaUpdates = [], pedidoUpdates = [], eventos = [];
    finais.forEach(function (x) {
      const r = x.rota;
      const grupoAtual = texto_(r.GRUPO_PARADA_ID);
      const quebraGrupo = !!grupoAtual && (
        texto_(r.DATA_OPERACIONAL) !== x.dataOperacional ||
        normalizar_(r.TURNO) !== x.turno ||
        !veiculosEquivalentes_({ VEICULO: r.VEICULO, PLACA: r.PLACA }, { VEICULO: x.veiculo, PLACA: x.placa }) ||
        x.tipoOperacao !== 'ENTREGA_CLIENTE'
      );
      if (quebraGrupo) gruposParaLimpar.push(grupoAtual);

      rotaUpdates.push({ linha: r.__linha, patch: {
        DATA_OPERACIONAL: x.dataOperacional,
        VEICULO: x.veiculo,
        PLACA: x.placa,
        TURNO: x.turno,
        TIPO_OPERACAO: x.tipoOperacao,
        LOJA_OPERACAO: x.tipoOperacao === 'ENTREGA_CLIENTE' ? '' : x.lojaOperacao,
        GRUPO_PARADA_ID: quebraGrupo ? '' : grupoAtual,
        MOTORISTA_REAL: x.motorista,
        MOTORISTA_CONFIRMADO: 'PENDENTE',
        STATUS_ROTA: APP.STATUS_ROTA.LIBERADA,
        LIBERADA_EM: agora
      }});

      todasEntregas.filter(function (e) { return texto_(e.ROTA_ID) === texto_(r.ROTA_ID); }).forEach(function (e) {
        entregaUpdates.push({ linha: e.__linha, patch: { VEICULO: x.veiculo, TURNO: x.turno, ETAPA_ATUAL: 'ROTA_LIBERADA' } });
      });
      lerObjetosPorValorComLinha_(APP.ABAS.PEDIDOS, 'ROTA_ID', r.ROTA_ID).forEach(function (p) {
        pedidoUpdates.push({ linha: p.__linha, patch: { DATA_OPERACIONAL: x.dataOperacional, STATUS_PEDIDO: APP.STATUS_ROTA.LIBERADA } });
      });
      eventos.push(eventoObjeto_(r.ROTA_ID, '', x.veiculo, x.motorista, 'LIBERACAO', 'ROTA_LIBERADA_EM_MASSA',
        'Carregamento ' + texto_(r.CARREGAMENTO) + ' revisado e liberado em massa para a jornada.', sessao.usuario, 'CENTRAL'));
    });

    patchLinhas_(APP.ABAS.ROTAS, rotaUpdates);
    patchLinhas_(APP.ABAS.ENTREGAS, entregaUpdates);
    patchLinhas_(APP.ABAS.PEDIDOS, pedidoUpdates);

    finais.forEach(function (x) {
      const persistida = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', x.rota.ROTA_ID);
      const lojaEsperada = x.tipoOperacao === 'ENTREGA_CLIENTE' ? '' : x.lojaOperacao;
      if (!persistida || normalizarTipoOperacao_(persistida.TIPO_OPERACAO) !== x.tipoOperacao || texto_(persistida.LOJA_OPERACAO) !== lojaEsperada) {
        throw new Error('A operação do carregamento ' + texto_(x.rota.CARREGAMENTO) + ' não foi persistida corretamente na aba ROTAS.');
      }
    });

    unicos_(gruposParaLimpar).forEach(limparGrupoParadaSolto_);
    eventos.push(eventoObjeto_('', '', base.veiculo, base.motorista, 'JORNADA', 'JORNADA_LIBERADA_EM_MASSA',
      finais.length + ' carregamento(s) liberado(s) em uma única jornada de ' + base.dataOperacional + ' / ' + base.turno + '.', sessao.usuario, 'CENTRAL'));
    registrarEventos_(eventos);
    return respostaCentralRotas_(rotaIds, {
      rotasLiberadas: finais.length,
      jornada: {
        dataOperacional: base.dataOperacional,
        turno: base.turno,
        veiculo: base.veiculo,
        placa: base.placa,
        motorista: base.motorista,
        carregamentos: finais.map(function (x) { return texto_(x.rota.CARREGAMENTO); })
      }
    });
  } finally {
    lock.releaseLock();
  }
}


function confirmarJornada(token, dataOperacional, turno, confirma) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  dataOperacional = dataIsoValidada_(dataOperacional, 'Data da jornada');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rotas = rotasDaJornadaMotorista_(sessao, dataOperacional, turno).filter(function (r) { return normalizar_(r.STATUS_ROTA) === APP.STATUS_ROTA.LIBERADA; });
    if (!rotas.length) throw new Error('Não há carregamentos liberados aguardando confirmação nesta jornada.');
    const motoristas = unicos_(rotas.map(function (r) { return normalizar_(r.MOTORISTA_REAL); }).filter(Boolean));
    if (motoristas.length > 1) throw new Error('Existem motoristas diferentes nos carregamentos desta jornada. A Central precisa corrigir antes da saída.');

    if (!confirma) {
      patchLinhas_(APP.ABAS.ROTAS, rotas.map(function (r) { return { linha: r.__linha, patch: { MOTORISTA_CONFIRMADO: 'DIVERGENTE' } }; }));
      registrarEventos_(rotas.map(function (r) {
        return eventoObjeto_(r.ROTA_ID, '', r.VEICULO, r.MOTORISTA_REAL, 'MOTORISTA', 'MOTORISTA_DIVERGENTE', 'Motorista informou divergência na jornada.', sessao.veiculo, 'MOTORISTA');
      }));
      return respostaMotoristaJornada_(sessao, dataOperacional, turno);
    }

    const agora = agora_(), ids = rotas.map(function (r) { return texto_(r.ROTA_ID); });
    patchLinhas_(APP.ABAS.ROTAS, rotas.map(function (r) {
      return { linha: r.__linha, patch: { MOTORISTA_CONFIRMADO: 'SIM', STATUS_ROTA: APP.STATUS_ROTA.SAINDO, SAIDA_EM: agora } };
    }));
    const entregas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', ids);
    patchLinhas_(APP.ABAS.ENTREGAS, entregas.map(function (e) { return { linha: e.__linha, patch: { ETAPA_ATUAL: 'SAINDO_CD' } }; }));
    const pedidos = lerObjetosPorValoresComLinha_(APP.ABAS.PEDIDOS, 'ROTA_ID', ids);
    patchLinhas_(APP.ABAS.PEDIDOS, pedidos.map(function (p) { return { linha: p.__linha, patch: { STATUS_PEDIDO: APP.STATUS_ROTA.SAINDO } }; }));
    registrarEventos_(rotas.map(function (r) {
      return eventoObjeto_(r.ROTA_ID, '', r.VEICULO, r.MOTORISTA_REAL, 'SAIDA', 'MOTORISTA_CONFIRMADO', 'Motorista confirmado na jornada e saída do CD registrada.', sessao.veiculo, 'MOTORISTA');
    }));
    return respostaMotoristaJornada_(sessao, dataOperacional, turno);
  } finally { lock.releaseLock(); }
}

function iniciarJornada(token, dataOperacional, turno) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  dataOperacional = dataIsoValidada_(dataOperacional, 'Data da jornada');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rotas = rotasDaJornadaMotorista_(sessao, dataOperacional, turno).filter(function (r) { return normalizar_(r.STATUS_ROTA) === APP.STATUS_ROTA.SAINDO; });
    if (!rotas.length || rotas.some(function (r) { return normalizar_(r.MOTORISTA_CONFIRMADO) !== 'SIM'; })) throw new Error('Confirme o motorista antes de iniciar a jornada.');
    const ids = rotas.map(function (r) { return texto_(r.ROTA_ID); });
    patchLinhas_(APP.ABAS.ROTAS, rotas.map(function (r) { return { linha: r.__linha, patch: { STATUS_ROTA: APP.STATUS_ROTA.EM_ROTA } }; }));
    const entregas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', ids).filter(function (e) { return normalizar_(e.STATUS_ENTREGA) === APP.STATUS_ENTREGA.PENDENTE; });
    patchLinhas_(APP.ABAS.ENTREGAS, entregas.map(function (e) { return { linha: e.__linha, patch: { ETAPA_ATUAL: 'EM_ROTA' } }; }));
    const pedidos = lerObjetosPorValoresComLinha_(APP.ABAS.PEDIDOS, 'ROTA_ID', ids);
    patchLinhas_(APP.ABAS.PEDIDOS, pedidos.map(function (p) { return { linha: p.__linha, patch: { STATUS_PEDIDO: APP.STATUS_ROTA.EM_ROTA } }; }));
    registrarEventos_(rotas.map(function (r) {
      return eventoObjeto_(r.ROTA_ID, '', r.VEICULO, r.MOTORISTA_REAL, 'ROTA', 'JORNADA_INICIADA', 'Carregamento incluído na jornada iniciada.', sessao.veiculo, 'MOTORISTA');
    }));
    return respostaMotoristaJornada_(sessao, dataOperacional, turno);
  } finally { lock.releaseLock(); }
}

function atualizarParada(token, paradaId, acao, motivo) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  acao = normalizar_(acao);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const parada = localizarParadaMotorista_(sessao, paradaId);
    if (!parada) throw new Error('Parada não encontrada.');
    if (parada.rotas.some(function (r) { return normalizar_(r.STATUS_ROTA) !== APP.STATUS_ROTA.EM_ROTA; })) throw new Error('A jornada precisa estar em andamento.');
    const atual = statusParadaObjetos_(parada.entregas);
    const agora = agora_();
    let patch = {}, evento = '', detalhe = '';
    if (acao === 'A_CAMINHO') {
      if (atual !== APP.STATUS_ENTREGA.PENDENTE) throw new Error('Esta parada não está pendente.');
      garantirNenhumaParadaAtiva_(sessao, parada.dataOperacional, parada.turno, parada.entregas.map(function (e) { return texto_(e.ENTREGA_ID); }));
      patch = { STATUS_ENTREGA: APP.STATUS_ENTREGA.A_CAMINHO, ETAPA_ATUAL: APP.STATUS_ENTREGA.A_CAMINHO, SELECIONADA_EM: agora };
      evento = 'A_CAMINHO_PARADA'; detalhe = 'Motorista selecionou a próxima parada.';
    } else if (acao === 'NO_CLIENTE') {
      if (atual !== APP.STATUS_ENTREGA.A_CAMINHO) throw new Error('Marque primeiro que está a caminho da parada.');
      patch = { STATUS_ENTREGA: APP.STATUS_ENTREGA.NO_CLIENTE, ETAPA_ATUAL: APP.STATUS_ENTREGA.NO_CLIENTE, CHEGADA_CLIENTE_EM: agora };
      evento = 'CHEGADA_PARADA'; detalhe = 'Chegada à parada registrada.';
    } else if (acao === 'ENTREGA_REALIZADA') {
      if (atual !== APP.STATUS_ENTREGA.NO_CLIENTE) throw new Error('Registre a chegada antes de concluir.');
      patch = { STATUS_ENTREGA: APP.STATUS_ENTREGA.ENTREGUE, ETAPA_ATUAL: APP.STATUS_ENTREGA.ENTREGUE, FINALIZADA_EM: agora, MOTIVO_RETORNO: '' };
      evento = parada.tipoOperacao === 'COLETA_LOJA_CD' ? 'COLETA_REALIZADA' : 'ENTREGA_REALIZADA';
      detalhe = parada.tipoOperacao === 'COLETA_LOJA_CD' ? 'Coleta concluída.' : 'Entrega concluída.';
    } else if (acao === 'RETORNO_REGISTRADO') {
      if (atual !== APP.STATUS_ENTREGA.NO_CLIENTE) throw new Error('Registre a chegada antes do retorno.');
      motivo = texto_(motivo);
      if (!motivoAtivo_(motivo)) throw new Error('Selecione um motivo de retorno válido.');
      patch = { STATUS_ENTREGA: APP.STATUS_ENTREGA.RETORNO, ETAPA_ATUAL: APP.STATUS_ENTREGA.RETORNO, MOTIVO_RETORNO: motivo, RETORNO_REGISTRADO_EM: agora, FINALIZADA_EM: agora };
      evento = 'RETORNO_REGISTRADO'; detalhe = motivo;
    } else throw new Error('Ação de parada inválida.');

    patchLinhas_(APP.ABAS.ENTREGAS, parada.entregas.map(function (e) { return { linha: e.__linha, patch: patch }; }));
    if (acao === 'ENTREGA_REALIZADA' || acao === 'RETORNO_REGISTRADO') {
      const idsEntregas = parada.entregas.map(function (e) { return texto_(e.ENTREGA_ID); });
      const pedidos = lerObjetosPorValoresComLinha_(APP.ABAS.PEDIDOS, 'ENTREGA_ID', idsEntregas);
      const pp = acao === 'ENTREGA_REALIZADA'
        ? { STATUS_PEDIDO: APP.STATUS_ENTREGA.ENTREGUE, MOTIVO_RETORNO: '' }
        : { STATUS_PEDIDO: APP.STATUS_ENTREGA.RETORNO, MOTIVO_RETORNO: motivo };
      patchLinhas_(APP.ABAS.PEDIDOS, pedidos.map(function (p) { return { linha: p.__linha, patch: pp }; }));
    }
    registrarEventos_(parada.rotas.map(function (r) {
      return eventoObjeto_(r.ROTA_ID, parada.id, r.VEICULO, r.MOTORISTA_REAL, 'PARADA', evento, detalhe, sessao.veiculo, 'MOTORISTA');
    }));
    return respostaMotoristaJornada_(sessao, parada.dataOperacional, parada.turno);
  } finally { lock.releaseLock(); }
}

function voltarParaCDJornada(token, dataOperacional, turno) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  dataOperacional = dataIsoValidada_(dataOperacional, 'Data da jornada');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const rotas = rotasDaJornadaMotorista_(sessao, dataOperacional, turno).filter(function (r) { return normalizar_(r.STATUS_ROTA) === APP.STATUS_ROTA.EM_ROTA; });
    if (!rotas.length) throw new Error('A jornada não está em andamento.');
    const ids = rotas.map(function (r) { return texto_(r.ROTA_ID); });
    const entregas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', ids);
    if (entregas.some(function (e) { return !statusEntregaTerminal_(e.STATUS_ENTREGA); })) throw new Error('Conclua todas as paradas antes de voltar para o CD.');
    patchLinhas_(APP.ABAS.ROTAS, rotas.map(function (r) { return { linha: r.__linha, patch: { STATUS_ROTA: APP.STATUS_ROTA.VOLTANDO } }; }));
    const pedidos = lerObjetosPorValoresComLinha_(APP.ABAS.PEDIDOS, 'ROTA_ID', ids).filter(function (p) { return !statusPedidoTerminal_(p.STATUS_PEDIDO); });
    patchLinhas_(APP.ABAS.PEDIDOS, pedidos.map(function (p) { return { linha: p.__linha, patch: { STATUS_PEDIDO: APP.STATUS_ROTA.VOLTANDO } }; }));
    registrarEventos_(rotas.map(function (r) {
      return eventoObjeto_(r.ROTA_ID, '', r.VEICULO, r.MOTORISTA_REAL, 'RETORNO_CD', 'VOLTANDO_CD', 'Retorno ao CD iniciado pela jornada.', sessao.veiculo, 'MOTORISTA');
    }));
    return respostaMotoristaJornada_(sessao, dataOperacional, turno);
  } finally { lock.releaseLock(); }
}

function chegadaCDJornada(token, dataOperacional, turno) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  dataOperacional = dataIsoValidada_(dataOperacional, 'Data da jornada');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const rotas = rotasDaJornadaMotorista_(sessao, dataOperacional, turno).filter(function (r) { return normalizar_(r.STATUS_ROTA) === APP.STATUS_ROTA.VOLTANDO; });
    if (!rotas.length) throw new Error('Registre primeiro o retorno ao CD.');
    const agora = agora_();
    patchLinhas_(APP.ABAS.ROTAS, rotas.map(function (r) {
      return { linha: r.__linha, patch: { STATUS_ROTA: APP.STATUS_ROTA.CHEGADA, RETORNO_CD_EM: agora, FINALIZADA_EM: agora } };
    }));
    registrarEventos_(rotas.map(function (r) {
      return eventoObjeto_(r.ROTA_ID, '', r.VEICULO, r.MOTORISTA_REAL, 'CHEGADA_CD', 'CHEGADA_CD', 'Chegada ao CD registrada pela jornada.', sessao.veiculo, 'MOTORISTA');
    }));
    return respostaMotoristaJornada_(sessao, dataOperacional, turno);
  } finally { lock.releaseLock(); }
}

function confirmarMotorista(token, rotaId, confirma) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rota = rotaDoMotorista_(sessao, rotaId);
    if (normalizar_(rota.STATUS_ROTA) !== APP.STATUS_ROTA.LIBERADA) throw new Error('A rota ainda não está pronta para confirmação.');

    if (!confirma) {
      patchLinha_(APP.ABAS.ROTAS, rota.__linha, { MOTORISTA_CONFIRMADO: 'DIVERGENTE' });
      registrarEvento_(rotaId, '', rota.VEICULO, rota.MOTORISTA_REAL, 'MOTORISTA', 'MOTORISTA_DIVERGENTE',
        'Motorista informou divergência. Aguardando correção da central.', sessao.veiculo, 'MOTORISTA');
      return { ok: true, data: bootstrapMotorista_(sessao) };
    }

    const agora = agora_();
    patchLinha_(APP.ABAS.ROTAS, rota.__linha, {
      MOTORISTA_CONFIRMADO: 'SIM',
      STATUS_ROTA: APP.STATUS_ROTA.SAINDO,
      SAIDA_EM: agora
    });
    atualizarEntregasDaRota_(rotaId, { ETAPA_ATUAL: 'SAINDO_CD' });
    atualizarPedidosDaRota_(rotaId, { STATUS_PEDIDO: APP.STATUS_ROTA.SAINDO });
    registrarEvento_(rotaId, '', rota.VEICULO, rota.MOTORISTA_REAL, 'SAIDA', 'MOTORISTA_CONFIRMADO',
      'Motorista confirmado e saída do CD registrada.', sessao.veiculo, 'MOTORISTA');
    atualizarPainel_();
    return { ok: true, data: bootstrapMotorista_(sessao) };
  } finally {
    lock.releaseLock();
  }
}

function iniciarRota(token, rotaId) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rota = rotaDoMotorista_(sessao, rotaId);
    if (normalizar_(rota.STATUS_ROTA) !== APP.STATUS_ROTA.SAINDO || normalizar_(rota.MOTORISTA_CONFIRMADO) !== 'SIM') {
      throw new Error('Confirme o motorista antes de iniciar a rota.');
    }
    patchLinha_(APP.ABAS.ROTAS, rota.__linha, { STATUS_ROTA: APP.STATUS_ROTA.EM_ROTA });
    atualizarEntregasDaRota_(rotaId, { ETAPA_ATUAL: 'EM_ROTA' }, [APP.STATUS_ENTREGA.PENDENTE]);
    atualizarPedidosDaRota_(rotaId, { STATUS_PEDIDO: APP.STATUS_ROTA.EM_ROTA });
    registrarEvento_(rotaId, '', rota.VEICULO, rota.MOTORISTA_REAL, 'ROTA', 'ROTA_INICIADA',
      'Veículo em rota.', sessao.veiculo, 'MOTORISTA');
    atualizarPainel_();
    return { ok: true, data: bootstrapMotorista_(sessao) };
  } finally {
    lock.releaseLock();
  }
}

function atualizarEntrega(token, entregaId, acao, motivo) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  acao = normalizar_(acao);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const entrega = buscarPorId_(APP.ABAS.ENTREGAS, 'ENTREGA_ID', entregaId);
    if (!entrega) throw new Error('Entrega não encontrada.');
    const rota = rotaDoMotorista_(sessao, entrega.ROTA_ID);
    if (normalizar_(rota.STATUS_ROTA) !== APP.STATUS_ROTA.EM_ROTA) throw new Error('A rota precisa estar em andamento.');

    const atual = normalizar_(entrega.STATUS_ENTREGA);
    const agora = agora_();
    let patch = {};
    let evento = '';
    let detalhe = '';

    if (acao === 'A_CAMINHO') {
      if (atual !== APP.STATUS_ENTREGA.PENDENTE) throw new Error('Esta entrega não está pendente.');
      garantirNenhumaEntregaAtiva_(rota.ROTA_ID, entregaId);
      patch = { STATUS_ENTREGA: APP.STATUS_ENTREGA.A_CAMINHO, ETAPA_ATUAL: APP.STATUS_ENTREGA.A_CAMINHO, SELECIONADA_EM: agora };
      evento = 'A_CAMINHO_CLIENTE';
      detalhe = 'Motorista selecionou o próximo cliente.';
    } else if (acao === 'NO_CLIENTE') {
      if (atual !== APP.STATUS_ENTREGA.A_CAMINHO) throw new Error('Marque primeiro que está a caminho do cliente.');
      patch = { STATUS_ENTREGA: APP.STATUS_ENTREGA.NO_CLIENTE, ETAPA_ATUAL: APP.STATUS_ENTREGA.NO_CLIENTE, CHEGADA_CLIENTE_EM: agora };
      evento = 'CHEGADA_CLIENTE';
      detalhe = 'Chegada ao cliente registrada.';
    } else if (acao === 'ENTREGA_REALIZADA') {
      if (atual !== APP.STATUS_ENTREGA.NO_CLIENTE) throw new Error('Registre a chegada ao cliente antes de concluir.');
      patch = {
        STATUS_ENTREGA: APP.STATUS_ENTREGA.ENTREGUE,
        ETAPA_ATUAL: APP.STATUS_ENTREGA.ENTREGUE,
        FINALIZADA_EM: agora,
        MOTIVO_RETORNO: ''
      };
      evento = 'ENTREGA_REALIZADA';
      detalhe = 'Entrega concluída.';
      atualizarPedidosDaEntrega_(entregaId, { STATUS_PEDIDO: APP.STATUS_ENTREGA.ENTREGUE, MOTIVO_RETORNO: '' });
    } else if (acao === 'RETORNO_REGISTRADO') {
      if (atual !== APP.STATUS_ENTREGA.NO_CLIENTE) throw new Error('Registre a chegada ao cliente antes do retorno.');
      motivo = texto_(motivo);
      if (!motivoAtivo_(motivo)) throw new Error('Selecione um motivo de retorno válido.');
      patch = {
        STATUS_ENTREGA: APP.STATUS_ENTREGA.RETORNO,
        ETAPA_ATUAL: APP.STATUS_ENTREGA.RETORNO,
        MOTIVO_RETORNO: motivo,
        RETORNO_REGISTRADO_EM: agora,
        FINALIZADA_EM: agora
      };
      evento = 'RETORNO_REGISTRADO';
      detalhe = motivo;
      atualizarPedidosDaEntrega_(entregaId, { STATUS_PEDIDO: APP.STATUS_ENTREGA.RETORNO, MOTIVO_RETORNO: motivo });
    } else {
      throw new Error('Ação de entrega inválida.');
    }

    patchLinha_(APP.ABAS.ENTREGAS, entrega.__linha, patch);
    registrarEvento_(rota.ROTA_ID, entregaId, rota.VEICULO, rota.MOTORISTA_REAL, 'ENTREGA', evento,
      detalhe, sessao.veiculo, 'MOTORISTA');
    atualizarPainel_();
    return { ok: true, data: bootstrapMotorista_(sessao) };
  } finally {
    lock.releaseLock();
  }
}

function voltarParaCD(token, rotaId) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rota = rotaDoMotorista_(sessao, rotaId);
    if (normalizar_(rota.STATUS_ROTA) !== APP.STATUS_ROTA.EM_ROTA) throw new Error('A rota não está em andamento.');
    const entregas = lerObjetosPorValorComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', rotaId);
    if (entregas.some(function (e) {
      const s = normalizar_(e.STATUS_ENTREGA);
      return s !== APP.STATUS_ENTREGA.ENTREGUE && s !== APP.STATUS_ENTREGA.RETORNO;
    })) throw new Error('Conclua todas as entregas antes de voltar para o CD.');

    patchLinha_(APP.ABAS.ROTAS, rota.__linha, { STATUS_ROTA: APP.STATUS_ROTA.VOLTANDO });
    atualizarPedidosDaRota_(rotaId, { STATUS_PEDIDO: APP.STATUS_ROTA.VOLTANDO }, true);
    registrarEvento_(rotaId, '', rota.VEICULO, rota.MOTORISTA_REAL, 'RETORNO_CD', 'VOLTANDO_CD',
      'Retorno ao CD iniciado.', sessao.veiculo, 'MOTORISTA');
    atualizarPainel_();
    return { ok: true, data: bootstrapMotorista_(sessao) };
  } finally {
    lock.releaseLock();
  }
}

function chegadaCD(token, rotaId) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const rota = rotaDoMotorista_(sessao, rotaId);
    if (normalizar_(rota.STATUS_ROTA) !== APP.STATUS_ROTA.VOLTANDO) throw new Error('Registre primeiro o retorno ao CD.');
    const agora = agora_();
    patchLinha_(APP.ABAS.ROTAS, rota.__linha, {
      STATUS_ROTA: APP.STATUS_ROTA.CHEGADA,
      RETORNO_CD_EM: agora,
      FINALIZADA_EM: agora
    });
    registrarEvento_(rotaId, '', rota.VEICULO, rota.MOTORISTA_REAL, 'CHEGADA_CD', 'CHEGADA_CD',
      'Chegada ao CD registrada.', sessao.veiculo, 'MOTORISTA');
    atualizarPainel_();
    return { ok: true, data: bootstrapMotorista_(sessao) };
  } finally {
    lock.releaseLock();
  }
}

function bootstrapCentral_(sessao) {
  const rotas = lerObjetos_(APP.ABAS.ROTAS);
  const entregas = lerObjetos_(APP.ABAS.ENTREGAS);
  const veiculos = consolidarVeiculos_(lerObjetos_(APP.ABAS.VEICULOS));
  const motivos = listarMotivos_();
  const porRota = {};
  entregas.forEach(function (e) {
    const id = texto_(e.ROTA_ID);
    if (!porRota[id]) porRota[id] = [];
    porRota[id].push(e);
  });

  const ordenadas = rotas.slice().sort(compararRotas_).slice(0, 300);
  const publicas = ordenadas.map(function (r) { return rotaPublica_(r, porRota[texto_(r.ROTA_ID)] || [], veiculos); });
  return {
    versao: APP.VERSION,
    perfil: 'ROTEIRIZADOR',
    usuario: { usuario: sessao.usuario, nome: sessao.nome },
    atualizacao: agora_(),
    eventCursor: marcadorEventos_(),
    refreshSeg: 15,
    kpis: calcularKpis_(rotas, entregas),
    rotas: publicas,
    jornadas: montarJornadasPublicas_(publicas),
    veiculos: veiculos.map(veiculoPublico_),
    motivos: motivos
  };
}

function bootstrapMotorista_(sessao) {
  const rotas = lerObjetos_(APP.ABAS.ROTAS);
  const veiculos = consolidarVeiculos_(lerObjetos_(APP.ABAS.VEICULOS));
  const veiculoSessao = localizarVeiculo_(veiculos, sessao.veiculoId || sessao.veiculo || sessao.placa) || {
    VEICULO_ID: sessao.veiculoId, VEICULO: sessao.veiculo, PLACA: sessao.placa
  };
  const permitidos = [
    APP.STATUS_ROTA.LIBERADA, APP.STATUS_ROTA.SAINDO, APP.STATUS_ROTA.EM_ROTA,
    APP.STATUS_ROTA.VOLTANDO
  ];
  const minhas = rotas.filter(function (r) {
    return veiculosEquivalentes_({ VEICULO: r.VEICULO, PLACA: r.PLACA }, veiculoSessao) &&
      permitidos.indexOf(normalizar_(r.STATUS_ROTA)) !== -1;
  }).sort(compararRotas_).slice(0, 100);
  const entregas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', minhas.map(function (r) { return texto_(r.ROTA_ID); }));
  const porRota = {};
  entregas.forEach(function (e) {
    const id = texto_(e.ROTA_ID);
    if (!porRota[id]) porRota[id] = [];
    porRota[id].push(e);
  });
  const publicas = minhas.map(function (r) { return rotaPublica_(r, porRota[texto_(r.ROTA_ID)] || [], veiculos); });

  return {
    versao: APP.VERSION,
    perfil: 'MOTORISTA',
    veiculo: veiculoPublico_(veiculoSessao),
    atualizacao: agora_(),
    eventCursor: marcadorEventos_(),
    refreshSeg: 15,
    rotas: publicas,
    jornadas: montarJornadasPublicas_(publicas),
    motivos: listarMotivos_()
  };
}

function rotaPublicaPorId_(rotaId, veiculos) {
  const rota = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', rotaId);
  if (!rota) return null;
  const entregas = lerObjetosPorValorComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', rotaId);
  const vs = veiculos || consolidarVeiculos_(lerObjetos_(APP.ABAS.VEICULOS));
  return rotaPublica_(rota, entregas, vs);
}

function rotasPublicasPorIds_(rotaIds) {
  const ids = unicos_((rotaIds || []).map(texto_).filter(Boolean));
  const veiculos = consolidarVeiculos_(lerObjetos_(APP.ABAS.VEICULOS));
  return ids.map(function (id) { return rotaPublicaPorId_(id, veiculos); }).filter(Boolean);
}

function jornadaPublicaMotorista_(sessao, dataOperacional, turno) {
  const rotas = rotasDaJornadaMotorista_(sessao, dataOperacional, turno);
  if (!rotas.length) return null;
  const veiculos = consolidarVeiculos_(lerObjetos_(APP.ABAS.VEICULOS));
  const entregas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', rotas.map(function (r) { return texto_(r.ROTA_ID); }));
  const porRota = {};
  entregas.forEach(function (e) {
    const id = texto_(e.ROTA_ID);
    if (!porRota[id]) porRota[id] = [];
    porRota[id].push(e);
  });
  const publicas = rotas.map(function (r) { return rotaPublica_(r, porRota[texto_(r.ROTA_ID)] || [], veiculos); });
  return montarJornadasPublicas_(publicas)[0] || null;
}

function respostaCentralRotas_(rotaIds, extra) {
  return Object.assign({
    ok: true,
    rotasAtualizadas: rotasPublicasPorIds_(rotaIds),
    eventCursor: marcadorEventos_(),
    atualizacao: agora_()
  }, extra || {});
}

function respostaMotoristaJornada_(sessao, dataOperacional, turno, extra) {
  const jornada = jornadaPublicaMotorista_(sessao, dataOperacional, turno);
  return Object.assign({
    ok: true,
    jornadaAtualizada: jornada,
    jornadaRemovida: jornada ? null : { dataOperacional: dataOperacional, turno: turno },
    eventCursor: marcadorEventos_(),
    atualizacao: agora_()
  }, extra || {});
}

function lerEventosDepois_(cursor) {
  const meta = metaAba_(APP.ABAS.EVENTOS);
  const lastRow = meta.sh.getLastRow();
  cursor = Math.max(1, Number(cursor) || 1);
  if (lastRow <= cursor) return { cursor: lastRow, eventos: [], fullReload: false };
  const qtd = lastRow - cursor;
  if (qtd > 200) return { cursor: lastRow, eventos: [], fullReload: true };
  const vals = meta.sh.getRange(cursor + 1, 1, qtd, meta.lastCol).getDisplayValues();
  return {
    cursor: lastRow,
    fullReload: false,
    eventos: vals.map(function (row, i) { return objetoDaLinha_(meta.headers, row, cursor + 1 + i); })
  };
}

function obterPulsoCentral(token, cursor) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  const pulso = lerEventosDepois_(cursor);
  if (pulso.fullReload) return { changed: true, fullReload: true, eventCursor: pulso.cursor, data: bootstrapCentral_(sessao) };
  if (!pulso.eventos.length) return { changed: false, eventCursor: pulso.cursor };
  const global = pulso.eventos.some(function (e) {
    const acao = normalizar_(e['AÇÃO']);
    return !texto_(e.ROTA_ID) && ['ARQUIVO_IMPORTADO', 'CARREGAMENTOS_UNIFICADOS', 'CARREGAMENTOS_DESUNIFICADOS'].indexOf(acao) !== -1;
  });
  if (global) return { changed: true, fullReload: true, eventCursor: pulso.cursor, data: bootstrapCentral_(sessao) };
  const ids = unicos_(pulso.eventos.map(function (e) { return texto_(e.ROTA_ID); }).filter(Boolean));
  return {
    changed: !!ids.length,
    fullReload: false,
    eventCursor: pulso.cursor,
    rotasAtualizadas: ids.length ? rotasPublicasPorIds_(ids) : [],
    atualizacao: agora_()
  };
}

function obterPulsoMotorista(token, cursor) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  const pulso = lerEventosDepois_(cursor);
  if (pulso.fullReload) return { changed: true, fullReload: true, eventCursor: pulso.cursor, data: bootstrapMotorista_(sessao) };
  if (!pulso.eventos.length) return { changed: false, eventCursor: pulso.cursor };
  const relevantes = pulso.eventos.filter(function (e) {
    if (!texto_(e.VEICULO) && normalizar_(e['AÇÃO']) === 'ARQUIVO_IMPORTADO') return true;
    return veiculosEquivalentes_({ VEICULO: e.VEICULO }, { VEICULO_ID: sessao.veiculoId, VEICULO: sessao.veiculo, PLACA: sessao.placa });
  });
  if (!relevantes.length) return { changed: false, eventCursor: pulso.cursor };
  return { changed: true, fullReload: true, eventCursor: pulso.cursor, data: bootstrapMotorista_(sessao) };
}

function rotaPublica_(r, entregas, veiculos) {
  entregas = entregas.slice().sort(function (a, b) {
    return (Number(a.ORDEM_MANUAL) || 999) - (Number(b.ORDEM_MANUAL) || 999);
  });
  const canonico = localizarVeiculo_(veiculos || [], texto_(r.VEICULO) || texto_(r.PLACA));
  return {
    id: texto_(r.ROTA_ID),
    monitorEm: ultimoMarcoRota_(r),
    dataImportacao: texto_(r.DATA_IMPORTACAO),
    dataFaturamentoBase: texto_(r.DTFATURAMENTO_BASE),
    dataSugerida: texto_(r.DATA_SUGERIDA),
    dataOperacional: texto_(r.DATA_OPERACIONAL),
    veiculo: canonico ? texto_(canonico.VEICULO) : texto_(r.VEICULO),
    placa: canonico ? texto_(canonico.PLACA) : texto_(r.PLACA),
    turno: texto_(r.TURNO),
    carregamento: texto_(r.CARREGAMENTO),
    tipoOperacao: normalizarTipoOperacao_(r.TIPO_OPERACAO),
    lojaOperacao: texto_(r.LOJA_OPERACAO),
    grupoParadaId: texto_(r.GRUPO_PARADA_ID),
    status: texto_(r.STATUS_ROTA),
    motoristaConfirmado: texto_(r.MOTORISTA_CONFIRMADO),
    motorista: texto_(r.MOTORISTA_REAL),
    liberadaEm: texto_(r.LIBERADA_EM),
    saidaEm: texto_(r.SAIDA_EM),
    retornoCdEm: texto_(r.RETORNO_CD_EM),
    finalizadaEm: texto_(r.FINALIZADA_EM),
    observacao: texto_(r.OBSERVAÇÃO),
    clientes: unicos_(entregas.map(function (e) { return texto_(e.CLIENTE); }).filter(Boolean)),
    entregas: entregas.map(entregaPublica_)
  };
}

function entregaPublica_(e) {
  return {
    id: texto_(e.ENTREGA_ID),
    rotaId: texto_(e.ROTA_ID),
    cliente: texto_(e.CLIENTE),
    codigoCliente: texto_(e.CODIGO_CLIENTE),
    endereco: texto_(e.ENDERECO_COMPLETO),
    enderecoMapa: enderecoMapa_(e),
    bairro: texto_(e.BAIRRO),
    cidade: texto_(e.CIDADE),
    uf: texto_(e.UF),
    cep: texto_(e.CEP),
    telefone: texto_(e.TELEFONE),
    qtdePedidos: Number(e.QTDE_PEDIDOS || 0),
    pedidos: listaTexto_(e.PEDIDOS),
    pedidosAntigos: listaTexto_(e.PEDIDOS_ANTIGOS),
    ordem: Number(e.ORDEM_MANUAL || 0),
    status: texto_(e.STATUS_ENTREGA),
    etapa: texto_(e.ETAPA_ATUAL),
    motivoRetorno: texto_(e.MOTIVO_RETORNO),
    selecionadaEm: texto_(e.SELECIONADA_EM),
    chegadaClienteEm: texto_(e.CHEGADA_CLIENTE_EM),
    finalizadaEm: texto_(e.FINALIZADA_EM),
    retornoRegistradoEm: texto_(e.RETORNO_REGISTRADO_EM)
  };
}

function veiculoPublico_(v) {
  return {
    id: texto_(v.VEICULO_ID),
    nome: texto_(v.VEICULO),
    placa: texto_(v.PLACA),
    label: rotuloVeiculo_(v),
    motoristaPadrao: texto_(v.MOTORISTA_PADRAO)
  };
}

function enderecoMapa_(e) {
  const bruto = texto_(e.ENDERECO_COMPLETO);
  const principal = texto_(bruto.split(/\s*•\s*/)[0] || bruto).replace(/\bCEP\s+/gi, '');
  const partes = [principal, texto_(e.BAIRRO), texto_(e.CIDADE), texto_(e.UF), texto_(e.CEP), 'Brasil'];
  const vistos = {};
  return partes.filter(function (p) {
    const k = normalizar_(p);
    if (!k || vistos[k]) return false;
    vistos[k] = true;
    return true;
  }).join(', ').replace(/\s+,/g, ',').replace(/,\s*,+/g, ', ').trim();
}

function enderecoMapaLoja_(loja) {
  const nome = texto_(loja);
  if (!nome) return '';
  if (/\b(RUA|AVENIDA|AV\.?|RODOVIA|TRAVESSA|ESTRADA|BR-|CE-|CEP)\b/i.test(nome) || /\d{5}-?\d{3}/.test(nome)) {
    return nome + (/,\s*BRASIL$/i.test(nome) ? '' : ', Brasil');
  }
  const semPrefixo = nome.replace(/^LOJA\s+/i, '').trim();
  return (/SIMPLIFIQUE/i.test(nome) ? nome : 'Simplifique Home Center ' + semPrefixo) + ', Ceará, Brasil';
}

function normalizarTipoOperacao_(valor) {
  const n = normalizar_(valor);
  if (n === 'COLETA_LOJA_CD' || n === 'COLETA' || n === 'LOJA_PARA_CD') return 'COLETA_LOJA_CD';
  if (n === 'ENTREGA_LOJA' || n === 'CD_PARA_LOJA') return 'ENTREGA_LOJA';
  return 'ENTREGA_CLIENTE';
}


function chaveDestinoUnificacao_(e) {
  e = e || {};
  const cliente = normalizarHeader_(e.CLIENTE != null ? e.CLIENTE : e.cliente) ||
    normalizarHeader_(e.CODIGO_CLIENTE != null ? e.CODIGO_CLIENTE : e.codigoCliente);
  const endereco = normalizarHeader_(e.ENDERECO_COMPLETO != null ? e.ENDERECO_COMPLETO : e.endereco).replace(/[^A-Z0-9]+/g, '');
  return cliente && endereco ? cliente + '|' + endereco : '';
}

function idParadaClienteAuto_(dataOperacional, turno, chaveDestino) {
  return ['C', texto_(dataOperacional), normalizar_(turno || 'MANHA'), encodeURIComponent(chaveDestino)].join('|');
}

function statusEntregaTerminal_(status) {
  status = normalizar_(status);
  return status === APP.STATUS_ENTREGA.ENTREGUE || status === APP.STATUS_ENTREGA.RETORNO;
}

function statusParadaObjetos_(entregas) {
  const sts = (entregas || []).map(function (e) { return normalizar_(e.STATUS_ENTREGA); });
  if (!sts.length) return APP.STATUS_ENTREGA.PENDENTE;
  if (sts.some(function (s) { return s === APP.STATUS_ENTREGA.NO_CLIENTE; })) return APP.STATUS_ENTREGA.NO_CLIENTE;
  if (sts.some(function (s) { return s === APP.STATUS_ENTREGA.A_CAMINHO; })) return APP.STATUS_ENTREGA.A_CAMINHO;
  if (sts.every(function (s) { return s === APP.STATUS_ENTREGA.ENTREGUE; })) return APP.STATUS_ENTREGA.ENTREGUE;
  if (sts.every(function (s) { return statusEntregaTerminal_(s); })) return sts.some(function (s) { return s === APP.STATUS_ENTREGA.RETORNO; }) ? APP.STATUS_ENTREGA.RETORNO : APP.STATUS_ENTREGA.ENTREGUE;
  return APP.STATUS_ENTREGA.PENDENTE;
}

function statusJornada_(rotas) {
  const sts = (rotas || []).map(function (r) { return normalizar_(r.status || r.STATUS_ROTA); });
  if (sts.length && sts.every(function (s) { return s === APP.STATUS_ROTA.CHEGADA; })) return APP.STATUS_ROTA.CHEGADA;
  if (sts.some(function (s) { return s === APP.STATUS_ROTA.VOLTANDO; })) return APP.STATUS_ROTA.VOLTANDO;
  if (sts.some(function (s) { return s === APP.STATUS_ROTA.EM_ROTA; })) return APP.STATUS_ROTA.EM_ROTA;
  if (sts.some(function (s) { return s === APP.STATUS_ROTA.SAINDO; })) return APP.STATUS_ROTA.SAINDO;
  return APP.STATUS_ROTA.LIBERADA;
}

function confirmacaoJornada_(rotas) {
  const vals = (rotas || []).map(function (r) { return normalizar_(r.motoristaConfirmado || r.MOTORISTA_CONFIRMADO); });
  if (vals.some(function (v) { return v === 'DIVERGENTE'; })) return 'DIVERGENTE';
  return vals.length && vals.every(function (v) { return v === 'SIM'; }) ? 'SIM' : 'PENDENTE';
}

function montarJornadasPublicas_(rotas) {
  const permitidos = [APP.STATUS_ROTA.LIBERADA, APP.STATUS_ROTA.SAINDO, APP.STATUS_ROTA.EM_ROTA, APP.STATUS_ROTA.VOLTANDO, APP.STATUS_ROTA.CHEGADA];
  const grupos = {};
  (rotas || []).forEach(function (r) {
    if (permitidos.indexOf(normalizar_(r.status)) === -1) return;
    const key = texto_(r.dataOperacional) + '|' + vehicleKey_((r.veiculo || '') + ' ' + (r.placa || '')) + '|' + normalizar_(r.turno || 'MANHA');
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(r);
  });
  return Object.keys(grupos).map(function (key) {
    const rs = grupos[key].slice().sort(function (a, b) { return String(a.turno).localeCompare(String(b.turno)) || String(a.carregamento).localeCompare(String(b.carregamento), 'pt-BR', { numeric: true }); });
    const first = rs[0];
    const motoristas = unicos_(rs.map(function (r) { return texto_(r.motorista); }).filter(Boolean));
    const horarios = function (campo) { return rs.map(function (r) { return texto_(r[campo]); }).filter(Boolean).sort(); };
    const liberadas = horarios('liberadaEm'), saidas = horarios('saidaEm'), retornos = horarios('retornoCdEm'), finalizadas = horarios('finalizadaEm');
    return {
      id: 'J|' + key,
      dataOperacional: first.dataOperacional,
      veiculo: first.veiculo,
      placa: first.placa,
      motorista: motoristas.join(' / '),
      turno: texto_(first.turno),
      motoristasDiferentes: motoristas.length > 1,
      motoristaConfirmado: confirmacaoJornada_(rs),
      status: statusJornada_(rs),
      liberadaEm: liberadas[0] || '',
      saidaEm: saidas[0] || '',
      retornoCdEm: retornos.length ? retornos[retornos.length - 1] : '',
      finalizadaEm: finalizadas.length ? finalizadas[finalizadas.length - 1] : '',
      rotaIds: rs.map(function (r) { return r.id; }),
      carregamentos: rs.map(function (r) { return r.carregamento; }),
      paradas: montarParadasPublicas_(rs)
    };
  }).sort(function (a, b) { return a.dataOperacional.localeCompare(b.dataOperacional) || String(a.veiculo).localeCompare(String(b.veiculo), 'pt-BR', { numeric: true }); });
}

function chaveLojaOperacao_(loja) {
  return normalizar_(loja).replace(/^SIMPLIFIQUE HOME CENTER\s+/, '').replace(/^LOJA\s+/, '').replace(/[^A-Z0-9]/g, '');
}

function idParadaLoja_(tipo, dataOperacional, turno, loja) {
  return ['S', normalizarTipoOperacao_(tipo), texto_(dataOperacional), normalizar_(turno || 'MANHA'), encodeURIComponent(chaveLojaOperacao_(loja))].join('|');
}

function montarParadasPublicas_(rotas) {
  const saida = [], gruposClienteAuto = {}, gruposLoja = {};
  (rotas || []).forEach(function (r, ri) {
    if (!(r.entregas || []).length) return;
    const tipo = normalizarTipoOperacao_(r.tipoOperacao);
    if (tipo !== 'ENTREGA_CLIENTE') {
      const loja = texto_(r.lojaOperacao) || 'Loja não informada';
      const chave = tipo + '|' + chaveLojaOperacao_(loja);
      if (!gruposLoja[chave]) gruposLoja[chave] = {
        tipo: tipo, loja: loja, rotas: [], entregas: [], ordem: ri * 1000,
        dataOperacional: texto_(r.dataOperacional), turno: texto_(r.turno)
      };
      gruposLoja[chave].rotas.push(r);
      gruposLoja[chave].entregas = gruposLoja[chave].entregas.concat(r.entregas || []);
      gruposLoja[chave].ordem = Math.min(gruposLoja[chave].ordem, ri * 1000);
      return;
    }

    (r.entregas || []).forEach(function (e, ei) {
      const ordem = ri * 1000 + (Number(e.ordem) || ei + 1);
      const chave = chaveDestinoUnificacao_(e);
      if (!chave) {
        saida.push(paradaPublica_('E:' + e.id, tipo, e.cliente, [r], [e], ordem));
        return;
      }
      if (!gruposClienteAuto[chave]) gruposClienteAuto[chave] = {
        chave: chave, rotas: [], entregas: [], ordem: ordem,
        dataOperacional: texto_(r.dataOperacional), turno: texto_(r.turno)
      };
      gruposClienteAuto[chave].rotas.push(r);
      gruposClienteAuto[chave].entregas.push(e);
      gruposClienteAuto[chave].ordem = Math.min(gruposClienteAuto[chave].ordem, ordem);
    });
  });

  Object.keys(gruposLoja).forEach(function (g) {
    const x = gruposLoja[g];
    saida.push(paradaPublica_(
      idParadaLoja_(x.tipo, x.dataOperacional, x.turno, x.loja),
      x.tipo, x.loja, x.rotas, x.entregas, x.ordem,
      { titulo: x.loja, cliente: '', codigoCliente: '', endereco: x.loja, enderecoMapa: enderecoMapaLoja_(x.loja), telefone: '' }
    ));
  });

  Object.keys(gruposClienteAuto).forEach(function (g) {
    const x = gruposClienteAuto[g], first = x.entregas[0] || {};
    const ids = new Set(), rotasUnicas = [];
    x.rotas.forEach(function (r) { if (!ids.has(r.id)) { ids.add(r.id); rotasUnicas.push(r); } });
    if (x.entregas.length === 1) {
      saida.push(paradaPublica_('E:' + first.id, 'ENTREGA_CLIENTE', first.cliente, rotasUnicas, x.entregas, x.ordem));
    } else {
      saida.push(paradaPublica_(
        idParadaClienteAuto_(x.dataOperacional, x.turno, x.chave),
        'ENTREGA_CLIENTE', first.cliente, rotasUnicas, x.entregas, x.ordem
      ));
    }
  });

  return saida.sort(function (a, b) { return a.ordem - b.ordem; }).map(function (p, i) { p.ordem = i + 1; return p; });
}

function paradaPublica_(id, tipo, titulo, rotas, entregas, ordem, destinoOverride) {
  const first = entregas[0] || {};
  const destino = destinoOverride || {};
  const tem = function (chave) { return Object.prototype.hasOwnProperty.call(destino, chave); };
  const status = statusParadaObjetos_((entregas || []).map(function (e) { return { STATUS_ENTREGA: e.status }; }));
  const ordenados = function (campo) {
    return (entregas || []).map(function (e) { return texto_(e[campo]); }).filter(Boolean).sort();
  };
  const chegadas = ordenados('chegadaClienteEm'), finalizadas = ordenados('finalizadaEm'), retornos = ordenados('retornoRegistradoEm');
  return {
    id: id,
    tipoOperacao: tipo,
    titulo: texto_(tem('titulo') ? destino.titulo : titulo),
    cliente: texto_(tem('cliente') ? destino.cliente : first.cliente),
    codigoCliente: texto_(tem('codigoCliente') ? destino.codigoCliente : first.codigoCliente),
    endereco: texto_(tem('endereco') ? destino.endereco : first.endereco),
    enderecoMapa: texto_(tem('enderecoMapa') ? destino.enderecoMapa : first.enderecoMapa),
    telefone: texto_(tem('telefone') ? destino.telefone : first.telefone),
    carregamentos: unicos_((rotas || []).map(function (r) { return texto_(r.carregamento); }).filter(Boolean)),
    rotaIds: (rotas || []).map(function (r) { return r.id; }),
    entregaIds: (entregas || []).map(function (e) { return e.id; }),
    pedidos: unicos_((entregas || []).reduce(function (a, e) { return a.concat(e.pedidos || []); }, [])),
    pedidosAntigos: unicos_((entregas || []).reduce(function (a, e) { return a.concat(e.pedidosAntigos || []); }, [])),
    status: status,
    motivoRetorno: unicos_((entregas || []).map(function (e) { return texto_(e.motivoRetorno); }).filter(Boolean)).join(' / '),
    selecionadaEm: ordenados('selecionadaEm')[0] || '',
    chegadaEm: chegadas[0] || '',
    concluidaEm: finalizadas.length ? finalizadas[finalizadas.length - 1] : '',
    retornoEm: retornos.length ? retornos[retornos.length - 1] : '',
    ordem: ordem
  };
}

function rotasDaJornadaMotorista_(sessao, dataOperacional, turno) {
  const candidatas = lerObjetosPorValorComLinha_(APP.ABAS.ROTAS, 'DATA_OPERACIONAL', dataOperacional);
  return candidatas.filter(function (r) {
    return (!turno || normalizar_(r.TURNO) === normalizar_(turno)) &&
      veiculosEquivalentes_({ VEICULO: r.VEICULO, PLACA: r.PLACA }, { VEICULO_ID: sessao.veiculoId, VEICULO: sessao.veiculo, PLACA: sessao.placa }) &&
      [APP.STATUS_ROTA.LIBERADA, APP.STATUS_ROTA.SAINDO, APP.STATUS_ROTA.EM_ROTA, APP.STATUS_ROTA.VOLTANDO].indexOf(normalizar_(r.STATUS_ROTA)) !== -1;
  });
}

function localizarParadaMotorista_(sessao, paradaId) {
  let selecionadas = [], rotasSel = [], tipo = 'ENTREGA_CLIENTE';
  const paradaTexto = String(paradaId || '');
  if (paradaTexto.indexOf('E:') === 0) {
    const id = paradaTexto.slice(2);
    const e = buscarPorId_(APP.ABAS.ENTREGAS, 'ENTREGA_ID', id);
    if (e) {
      const r = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', e.ROTA_ID);
      if (r) { selecionadas = [e]; rotasSel = [r]; }
    }
  } else if (paradaTexto.indexOf('R:') === 0) {
    const id = paradaTexto.slice(2);
    const r = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', id);
    if (r) {
      rotasSel = [r];
      selecionadas = lerObjetosPorValorComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', id);
      tipo = normalizarTipoOperacao_(r.TIPO_OPERACAO);
    }
  } else if (paradaTexto.indexOf('S|') === 0) {
    const partes = paradaTexto.split('|');
    if (partes.length >= 5) {
      tipo = normalizarTipoOperacao_(partes[1]);
      const dataOperacional = texto_(partes[2]), turno = texto_(partes[3]);
      let lojaNormalizada = '';
      try { lojaNormalizada = decodeURIComponent(partes.slice(4).join('|')); } catch (_) { lojaNormalizada = partes.slice(4).join('|'); }
      rotasSel = rotasDaJornadaMotorista_(sessao, dataOperacional, turno).filter(function (r) {
        return normalizarTipoOperacao_(r.TIPO_OPERACAO) === tipo && chaveLojaOperacao_(r.LOJA_OPERACAO) === lojaNormalizada;
      });
      const ids = rotasSel.map(function (r) { return texto_(r.ROTA_ID); });
      selecionadas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', ids);
    }
  } else if (paradaTexto.indexOf('C|') === 0) {
    const partes = paradaTexto.split('|');
    if (partes.length >= 4) {
      const dataOperacional = texto_(partes[1]), turno = texto_(partes[2]);
      let chaveDestino = '';
      try { chaveDestino = decodeURIComponent(partes.slice(3).join('|')); } catch (_) { chaveDestino = partes.slice(3).join('|'); }
      rotasSel = rotasDaJornadaMotorista_(sessao, dataOperacional, turno).filter(function (r) {
        return normalizarTipoOperacao_(r.TIPO_OPERACAO) === 'ENTREGA_CLIENTE';
      });
      const ids = rotasSel.map(function (r) { return texto_(r.ROTA_ID); });
      selecionadas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', ids).filter(function (e) {
        return chaveDestinoUnificacao_(e) === chaveDestino;
      });
      tipo = 'ENTREGA_CLIENTE';
    }
  } else if (paradaTexto.indexOf('G:') === 0) {
    const g = paradaTexto.slice(2);
    rotasSel = lerObjetosPorValorComLinha_(APP.ABAS.ROTAS, 'GRUPO_PARADA_ID', g);
    const ids = rotasSel.map(function (r) { return texto_(r.ROTA_ID); });
    selecionadas = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', ids);
  }
  rotasSel = rotasSel.filter(function (r) {
    return veiculosEquivalentes_({ VEICULO: r.VEICULO, PLACA: r.PLACA }, { VEICULO_ID: sessao.veiculoId, VEICULO: sessao.veiculo, PLACA: sessao.placa }) &&
      normalizar_(r.STATUS_ROTA) === APP.STATUS_ROTA.EM_ROTA;
  });
  if (!rotasSel.length || !selecionadas.length) return null;
  const idsPermitidos = new Set(rotasSel.map(function (r) { return texto_(r.ROTA_ID); }));
  selecionadas = selecionadas.filter(function (e) { return idsPermitidos.has(texto_(e.ROTA_ID)); });
  if (!selecionadas.length) return null;
  return { id: texto_(paradaId), tipoOperacao: tipo, dataOperacional: texto_(rotasSel[0].DATA_OPERACIONAL), turno: texto_(rotasSel[0].TURNO), rotas: rotasSel, entregas: selecionadas };
}

function garantirNenhumaParadaAtiva_(sessao, dataOperacional, turno, excetoIds) {
  const rotas = rotasDaJornadaMotorista_(sessao, dataOperacional, turno);
  const idsRotas = rotas.map(function (r) { return texto_(r.ROTA_ID); });
  const exc = new Set((excetoIds || []).map(texto_));
  const ativa = lerObjetosPorValoresComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', idsRotas).some(function (e) {
    return !exc.has(texto_(e.ENTREGA_ID)) && [APP.STATUS_ENTREGA.A_CAMINHO, APP.STATUS_ENTREGA.NO_CLIENTE].indexOf(normalizar_(e.STATUS_ENTREGA)) !== -1;
  });
  if (ativa) throw new Error('Finalize a parada atual antes de selecionar outra.');
}

function calcularKpis_(rotas, entregas) {
  const execucao = [
    APP.STATUS_ROTA.LIBERADA, APP.STATUS_ROTA.SAINDO,
    APP.STATUS_ROTA.EM_ROTA, APP.STATUS_ROTA.VOLTANDO
  ];
  return {
    aguardandoLiberacao: rotas.filter(function (r) { return normalizar_(r.STATUS_ROTA) === APP.STATUS_ROTA.AGUARDANDO; }).length,
    emExecucao: rotas.filter(function (r) { return execucao.indexOf(normalizar_(r.STATUS_ROTA)) !== -1; }).length,
    entregasPendentes: entregas.filter(function (e) {
      return [APP.STATUS_ENTREGA.ENTREGUE, APP.STATUS_ENTREGA.RETORNO].indexOf(normalizar_(e.STATUS_ENTREGA)) === -1;
    }).length,
    retornos: entregas.filter(function (e) { return normalizar_(e.STATUS_ENTREGA) === APP.STATUS_ENTREGA.RETORNO; }).length,
    veiculosAtivos: new Set(rotas.filter(function (r) {
      return execucao.indexOf(normalizar_(r.STATUS_ROTA)) !== -1;
    }).map(function (r) { const t = tokensVeiculoObj_({ VEICULO: r.VEICULO, PLACA: r.PLACA }); return t.numero || t.placa || t.chave; })).size
  };
}

function atualizarPainel_() {
  const rotas = lerObjetos_(APP.ABAS.ROTAS);
  const entregas = lerObjetos_(APP.ABAS.ENTREGAS);
  const k = calcularKpis_(rotas, entregas);
  const sh = abrirPlanilha_().getSheetByName(APP.ABAS.PAINEL);
  const agora = agora_();
  const vals = [
    ['Rotas aguardando liberação', k.aguardandoLiberacao, agora],
    ['Rotas em execução', k.emExecucao, agora],
    ['Entregas pendentes', k.entregasPendentes, agora],
    ['Retornos informados', k.retornos, agora]
  ];
  sh.getRange(2, 1, vals.length, 3).setValues(vals);
}

function parseImportacao_(linhas) {
  if (!Array.isArray(linhas) || !linhas.length) throw new Error('O arquivo não possui dados.');
  if (linhas.length > APP.MAX_IMPORT_ROWS + 30) throw new Error('O arquivo excede o limite de ' + APP.MAX_IMPORT_ROWS + ' linhas.');

  const headerIndex = localizarCabecalho_(linhas);
  if (headerIndex < 0) throw new Error('Não foi possível localizar o cabeçalho da base.');
  const mapa = mapearCabecalho_(linhas[headerIndex]);
  const essenciais = ['Pedido', 'DTFaturamento', 'Veiculo', 'Carregamento', 'Cliente', 'Endereço Entrega'];
  const faltantes = essenciais.filter(function (c) { return mapa[c] == null; });
  if (faltantes.length) throw new Error('Colunas obrigatórias ausentes: ' + faltantes.join(', ') + '.');

  const validas = [];
  const invalidas = [];
  const inicio = headerIndex + 1;
  for (let i = inicio; i < linhas.length; i++) {
    const row = Array.isArray(linhas[i]) ? linhas[i] : [];
    if (!row.some(function (v) { return texto_(v); })) continue;
    const dados = {};
    BASE_COLUNAS.forEach(function (c) {
      dados[c] = mapa[c] == null ? '' : texto_(row[mapa[c]]);
    });
    if (!dados.Pedido) continue;

    const data = parseData_(dados.DTFaturamento);
    const erros = [];
    if (!data) erros.push('DTFaturamento inválida');
    if (!dados.Veiculo) erros.push('Veiculo vazio');
    if (!dados.Carregamento) erros.push('Carregamento vazio');
    if (!dados.Cliente) erros.push('Cliente vazio');
    if (!dados['Endereço Entrega']) erros.push('Endereço vazio');

    if (erros.length) {
      invalidas.push({ linha: i + 1, pedido: dados.Pedido, erro: erros.join('; ') });
      continue;
    }
    validas.push({ linha: i + 1, dados: dados, data: data, dataIso: dataIso_(data) });
  }

  return {
    headerIndex: headerIndex,
    lidas: Math.max(0, linhas.length - inicio),
    validas: validas,
    invalidas: invalidas,
    grupos: agruparLinhasImportacao_(validas)
  };
}

function agruparLinhasImportacao_(validas) {
  const gruposMap = {};
  validas.forEach(function (item) {
    const key = vehicleKey_(item.dados.Veiculo) + '|' + normalizar_(item.dados.Carregamento);
    if (!gruposMap[key]) gruposMap[key] = { chave: key, veiculo: item.dados.Veiculo, carregamento: item.dados.Carregamento, linhas: [] };
    gruposMap[key].linhas.push(item);
  });
  return Object.keys(gruposMap).map(function (key) {
    const g = gruposMap[key];
    g.baseData = g.linhas.reduce(function (max, x) { return !max || x.dataIso > max ? x.dataIso : max; }, '');
    g.temAntigos = g.linhas.some(function (x) { return x.dataIso < g.baseData; });
    return g;
  });
}

function chavePedidoImportacao_(dados) {
  const pedido = normalizarHeader_(dados && dados.Pedido);
  if (!pedido) return '';
  let filial = normalizarHeader_(dados && dados.Filial);
  if (/^\d+$/.test(filial)) filial = String(Number(filial));
  return (filial || 'SEM_FILIAL') + '|' + pedido;
}

function filtrarPedidosNovos_(validas, existentes) {
  const mapa = {};
  (existentes || []).forEach(function (p) {
    const chave = chavePedidoImportacao_(p);
    if (!chave) return;
    const status = normalizar_(p.STATUS_PEDIDO);
    if (!mapa[chave] || status === APP.STATUS_ENTREGA.ENTREGUE) mapa[chave] = status;
  });

  const vistas = new Set(Object.keys(mapa));
  const novas = [];
  let ignorados = 0;
  let entregues = 0;
  let outros = 0;
  validas.forEach(function (item) {
    const chave = chavePedidoImportacao_(item.dados);
    if (vistas.has(chave)) {
      ignorados++;
      if (mapa[chave] === APP.STATUS_ENTREGA.ENTREGUE) entregues++;
      else outros++;
      return;
    }
    vistas.add(chave);
    mapa[chave] = 'NOVO';
    novas.push(item);
  });
  return { novas: novas, ignorados: ignorados, entregues: entregues, outros: outros };
}

function localizarCabecalho_(linhas) {
  const limite = Math.min(linhas.length, 25);
  for (let i = 0; i < limite; i++) {
    const norm = (linhas[i] || []).map(normalizarHeader_);
    if (norm.indexOf('PEDIDO') !== -1 && norm.indexOf('DTFATURAMENTO') !== -1 && norm.indexOf('VEICULO') !== -1) return i;
  }
  return -1;
}

function mapearCabecalho_(row) {
  const alias = {};
  BASE_COLUNAS.forEach(function (c) { alias[normalizarHeader_(c)] = c; });
  const mapa = {};
  (row || []).forEach(function (v, i) {
    const canon = alias[normalizarHeader_(v)];
    if (canon && mapa[canon] == null) mapa[canon] = i;
  });
  return mapa;
}

function agruparEntregas_(linhas) {
  const map = {};
  linhas.forEach(function (item) {
    const d = item.dados;
    const endereco = montarEndereco_(d);
    const cliente = texto_(d['Código']) || texto_(d.Cliente);
    const key = normalizar_(cliente) + '|' + normalizar_(endereco);
    if (!map[key]) map[key] = { chave: key, endereco: endereco, linhas: [] };
    map[key].linhas.push(item);
  });
  return Object.keys(map).map(function (k) { return map[k]; });
}

function montarEndereco_(d) {
  const rua = texto_(d['Endereço Entrega']);
  const numero = texto_(d['Número']);
  const comp = texto_(d.Complemento);
  const bairro = texto_(d.Bairro);
  const cidadeUf = [texto_(d.Cidade), texto_(d.UF)].filter(Boolean).join('/');
  const cep = texto_(d.CEP);
  const ref = texto_(d['Ponto Referência']);
  return [
    [rua, numero].filter(Boolean).join(', '),
    comp,
    bairro,
    cidadeUf,
    cep ? 'CEP ' + cep : '',
    ref ? 'Ref.: ' + ref : ''
  ].filter(Boolean).join(' • ');
}

function chaveEntregaExistente_(e) {
  const cliente = texto_(e.CODIGO_CLIENTE) || texto_(e.CLIENTE);
  return normalizar_(cliente) + '|' + normalizar_(e.ENDERECO_COMPLETO);
}

function inferirTurno_(linhas) {
  const horas = linhas.map(function (x) { return extrairHora_(x.dados.HORAFECHA); }).filter(function (h) { return h != null; });
  if (!horas.length) return 'MANHA';
  const media = horas.reduce(function (a, b) { return a + b; }, 0) / horas.length;
  return media < 12 ? 'MANHA' : 'TARDE';
}

function extrairHora_(v) {
  const m = texto_(v).match(/(?:^|\s)(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  return h >= 0 && h <= 23 ? h : null;
}

function sugerirData_(data, opcoesSexta) {
  if (!data) throw new Error('Data de faturamento inválida.');
  let dias = 1;
  if (data.getDay() === 5) {
    const base = dataIso_(data);
    const escolha = normalizar_((opcoesSexta || {})[base]);
    if (escolha === 'SEGUNDA') dias = 3;
    else if (escolha === 'SABADO') dias = 1;
    else throw new Error('Escolha sábado ou segunda-feira para ' + dataBr_(base) + '.');
  }
  return dataIso_(new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias, 12, 0, 0, 0));
}

function parseData_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate(), 12);
  if (typeof valor === 'number' && isFinite(valor)) return excelSerialData_(valor);
  let s = texto_(valor);
  if (!s) return null;
  if (/^\d{5}(?:[.,]\d+)?$/.test(s)) return excelSerialData_(Number(s.replace(',', '.')));

  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s|$)/);
  if (m) {
    let y = Number(m[3]); if (y < 100) y += y >= 70 ? 1900 : 2000;
    return dataSegura_(y, Number(m[2]), Number(m[1]));
  }
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s]|$)/);
  if (m) return dataSegura_(Number(m[1]), Number(m[2]), Number(m[3]));

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}

function excelSerialData_(n) {
  const base = new Date(1899, 11, 30, 12);
  const d = new Date(base.getTime() + Math.floor(n) * 86400000);
  return isNaN(d.getTime()) ? null : d;
}

function dataSegura_(y, m, d) {
  const x = new Date(y, m - 1, d, 12);
  if (x.getFullYear() !== y || x.getMonth() !== m - 1 || x.getDate() !== d) return null;
  return x;
}

function dataIso_(d) {
  return [d.getFullYear(), pad2_(d.getMonth() + 1), pad2_(d.getDate())].join('-');
}

function dataBr_(iso) {
  const p = texto_(iso).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : texto_(iso);
}

function dataIsoValidada_(v, nome) {
  const d = parseData_(v);
  if (!d) throw new Error((nome || 'Data') + ' inválida.');
  return dataIso_(d);
}

function fingerprintImport_(item, veiculoNome, carregamento) {
  return [
    texto_(item.dados.Pedido), item.dataIso, vehicleKey_(veiculoNome),
    normalizar_(carregamento), normalizar_(montarEndereco_(item.dados))
  ].join('|');
}

function fingerprintPedidoObj_(p) {
  return [
    texto_(p.Pedido),
    dataIsoValidadaSilenciosa_(p.DTFaturamento),
    vehicleKey_(p.Veiculo),
    normalizar_(p.Carregamento),
    normalizar_(montarEndereco_(p))
  ].join('|');
}

function dataIsoValidadaSilenciosa_(v) {
  const d = parseData_(v);
  return d ? dataIso_(d) : texto_(v);
}

function statusPedidoTerminal_(s) {
  s = normalizar_(s);
  return [APP.STATUS_ENTREGA.ENTREGUE, APP.STATUS_ENTREGA.RETORNO, 'CANCELADO'].indexOf(s) !== -1;
}

function criarVeiculoImportado_(nome, motorista, importId) {
  const raw = texto_(nome);
  return {
    VEICULO_ID: vehicleKey_(raw) || novoId_('V').slice(-8),
    VEICULO: /^CARRO\s+/i.test(raw) ? raw : (/^\d+$/.test(raw) ? 'Carro ' + raw : raw),
    PLACA: '',
    MOTORISTA_PADRAO: texto_(motorista),
    SENHA: APP.SENHA_VEICULO_PADRAO,
    ATIVO: 'SIM',
    OBSERVAÇÃO: 'Criado automaticamente na importação ' + importId
  };
}

function modaTexto_(valores) {
  const cont = {};
  let best = '', n = 0;
  (valores || []).forEach(function (v) {
    v = texto_(v);
    if (!v) return;
    const k = normalizar_(v);
    cont[k] = (cont[k] || { n: 0, v: v });
    cont[k].n++;
    if (cont[k].n > n) { n = cont[k].n; best = cont[k].v; }
  });
  return best;
}

function garantirNenhumaEntregaAtiva_(rotaId, excetoId) {
  const ativas = lerObjetos_(APP.ABAS.ENTREGAS).filter(function (e) {
    return texto_(e.ROTA_ID) === texto_(rotaId) &&
      texto_(e.ENTREGA_ID) !== texto_(excetoId) &&
      [APP.STATUS_ENTREGA.A_CAMINHO, APP.STATUS_ENTREGA.NO_CLIENTE].indexOf(normalizar_(e.STATUS_ENTREGA)) !== -1;
  });
  if (ativas.length) throw new Error('Finalize o cliente atual antes de selecionar outro.');
}

function motivoAtivo_(motivo) {
  const n = normalizar_(motivo);
  return listarMotivos_().some(function (m) { return normalizar_(m) === n; });
}

function listarMotivos_() {
  const cache = CacheService.getScriptCache();
  const chave = 'motivos:v1';
  const salvo = cache.get(chave);
  if (salvo) { try { return JSON.parse(salvo); } catch (_) {} }
  const motivos = lerObjetos_(APP.ABAS.MOTIVOS)
    .filter(function (m) { return normalizar_(m.ATIVO || 'SIM') !== 'NAO'; })
    .map(function (m) { return texto_(m.MOTIVO); })
    .filter(Boolean);
  cache.put(chave, JSON.stringify(motivos), 600);
  return motivos;
}

function rotaDoMotorista_(sessao, rotaId) {
  const rota = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', rotaId);
  if (!rota) throw new Error('Rota não encontrada.');
  if (!veiculosEquivalentes_({ VEICULO: rota.VEICULO, PLACA: rota.PLACA }, { VEICULO_ID: sessao.veiculoId, VEICULO: sessao.veiculo, PLACA: sessao.placa })) throw new Error('Esta rota não pertence ao veículo conectado.');
  return rota;
}

function atualizarEntregasDaRota_(rotaId, patch, somenteStatus) {
  const itens = lerObjetosPorValorComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', rotaId).filter(function (e) {
    return !somenteStatus || somenteStatus.indexOf(normalizar_(e.STATUS_ENTREGA)) !== -1;
  });
  patchLinhas_(APP.ABAS.ENTREGAS, itens.map(function (e) { return { linha: e.__linha, patch: patch }; }));
}

function atualizarPedidosDaRota_(rotaId, patch, preservarFinais) {
  const itens = lerObjetosPorValorComLinha_(APP.ABAS.PEDIDOS, 'ROTA_ID', rotaId).filter(function (p) {
    return !preservarFinais || !statusPedidoTerminal_(p.STATUS_PEDIDO);
  });
  patchLinhas_(APP.ABAS.PEDIDOS, itens.map(function (p) { return { linha: p.__linha, patch: patch }; }));
}

function atualizarPedidosDaEntrega_(entregaId, patch) {
  const itens = lerObjetosPorValorComLinha_(APP.ABAS.PEDIDOS, 'ENTREGA_ID', entregaId);
  patchLinhas_(APP.ABAS.PEDIDOS, itens.map(function (p) { return { linha: p.__linha, patch: patch }; }));
}

function eventoObjeto_(rotaId, entregaId, veiculo, motorista, etapa, acao, detalhe, usuario, origem) {
  return {
    EVENTO_ID: novoId_('EV'),
    DATA_HORA: agora_(),
    ROTA_ID: texto_(rotaId),
    ENTREGA_ID: texto_(entregaId),
    VEICULO: texto_(veiculo),
    MOTORISTA: texto_(motorista),
    ETAPA: texto_(etapa),
    AÇÃO: texto_(acao),
    DETALHE: texto_(detalhe),
    USUARIO: texto_(usuario),
    ORIGEM: texto_(origem)
  };
}

function registrarEventos_(eventos) {
  if (eventos && eventos.length) anexarObjetos_(APP.ABAS.EVENTOS, eventos);
}

function registrarEvento_(rotaId, entregaId, veiculo, motorista, etapa, acao, detalhe, usuario, origem) {
  registrarEventos_([eventoObjeto_(rotaId, entregaId, veiculo, motorista, etapa, acao, detalhe, usuario, origem)]);
}

function validarArquivoExcel_(arquivo) {
  const nome = texto_(arquivo).toLowerCase();
  if (!/\.(xlsx|xls)$/.test(nome)) throw new Error('Selecione um arquivo .xls ou .xlsx.');
}

function criarSessao_(dados) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const s = Object.assign({}, dados, { token: token, criadoEm: Date.now() });
  CacheService.getScriptCache().put('sessao:' + token, JSON.stringify(s), APP.SESSION_TTL);
  return s;
}

function obterSessao_(token) {
  token = texto_(token);
  if (!token) throw new Error('Sessão expirada. Entre novamente.');
  const cache = CacheService.getScriptCache();
  const raw = cache.get('sessao:' + token);
  if (!raw) throw new Error('Sessão expirada. Entre novamente.');
  const s = JSON.parse(raw);
  cache.put('sessao:' + token, JSON.stringify(s), APP.SESSION_TTL);
  return s;
}

function exigirSessao_(token, perfil) {
  const s = obterSessao_(token);
  if (perfil && s.perfil !== perfil) throw new Error('Acesso não autorizado.');
  return s;
}

function garantirUsuarioInicial_() {
  const usuarios = lerObjetosComLinha_(APP.ABAS.USUARIOS);
  if (usuarios.some(function (u) { return normalizarUsuario_(u.USUARIO) === 'diego'; })) return;
  const salt = gerarSalt_();
  anexarObjetos_(APP.ABAS.USUARIOS, [{
    USUARIO: 'diego',
    NOME: 'Diego',
    PERFIL: 'ROTEIRIZADOR',
    SENHA_HASH: hashSenha_('251014', salt),
    SALT: salt,
    ATIVO: 'SIM',
    CRIADO_EM: agora_(),
    ULTIMO_ACESSO: ''
  }]);
}

function hashSenha_(senha, salt) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    texto_(salt) + '|' + texto_(senha),
    Utilities.Charset.UTF_8
  );
  return bytes.map(function (b) {
    const n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function compararSenha_(senha, hash, salt) {
  return hashSenha_(senha, salt) === texto_(hash);
}

function gerarSalt_() {
  return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}

let __SS_CACHE = null;
let __META_ABAS_CACHE = {};

function abrirPlanilha_() {
  if (!__SS_CACHE) __SS_CACHE = SpreadsheetApp.openById(APP.PLANILHA_ID);
  return __SS_CACHE;
}

function limparCachesExecucao_() {
  __META_ABAS_CACHE = {};
}

function metaAba_(aba, forcar) {
  if (!forcar && __META_ABAS_CACHE[aba]) return __META_ABAS_CACHE[aba];
  const sh = abrirPlanilha_().getSheetByName(aba);
  if (!sh) throw new Error('A aba "' + aba + '" não existe. Execute setupInicial().');
  const lastCol = Math.max(1, sh.getLastColumn());
  const headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const mapa = {};
  headers.forEach(function (h, i) { const n = normalizarHeader_(h); if (n) mapa[n] = i; });
  const meta = { sh: sh, headers: headers, mapa: mapa, lastCol: lastCol };
  __META_ABAS_CACHE[aba] = meta;
  return meta;
}

function marcadorEventos_() {
  const sh = abrirPlanilha_().getSheetByName(APP.ABAS.EVENTOS);
  return sh ? Math.max(1, sh.getLastRow()) : 1;
}


function garantirAba_(ss, nome, cabecalhos) {
  let sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  const largura = Math.max(1, sh.getLastColumn(), cabecalhos.length);
  let atuais = sh.getRange(1, 1, 1, largura).getDisplayValues()[0];
  if (!atuais.some(Boolean)) {
    sh.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  } else {
    const norm = atuais.map(normalizarHeader_);
    const faltantes = cabecalhos.filter(function (h) { return norm.indexOf(normalizarHeader_(h)) === -1; });
    if (faltantes.length) sh.getRange(1, sh.getLastColumn() + 1, 1, faltantes.length).setValues([faltantes]);
  }
  sh.setFrozenRows(1);
  return sh;
}

function formatarEstrutura_(ss) {
  Object.keys(APP.CABECALHOS).forEach(function (nome) {
    const sh = ss.getSheetByName(nome);
    if (!sh) return;
    const cols = Math.max(1, sh.getLastColumn());
    sh.getRange(1, 1, 1, cols).setFontWeight('bold').setBackground('#173A67').setFontColor('#ffffff');
  });
}

function garantirConfig_(chave, valor, descricao) {
  const itens = lerObjetosComLinha_(APP.ABAS.CONFIG);
  const x = itens.find(function (i) { return normalizar_(i.CHAVE) === normalizar_(chave); });
  if (x) {
    patchLinha_(APP.ABAS.CONFIG, x.__linha, { VALOR: valor, DESCRIÇÃO: descricao });
  } else {
    anexarObjetos_(APP.ABAS.CONFIG, [{ CHAVE: chave, VALOR: valor, DESCRIÇÃO: descricao }]);
  }
}

function obterConfig_(chave) {
  const item = lerObjetos_(APP.ABAS.CONFIG).find(function (x) { return normalizar_(x.CHAVE) === normalizar_(chave); });
  return item ? texto_(item.VALOR) : '';
}

function lerObjetos_(aba, incluirExcluidos) {
  return lerObjetosComLinha_(aba, incluirExcluidos).map(function (o) {
    const c = Object.assign({}, o);
    delete c.__linha;
    return c;
  });
}

function objetoDaLinha_(headers, row, linha) {
  const o = { __linha: linha };
  headers.forEach(function (h, i) { if (h) o[h] = row[i]; });
  return o;
}

function lerObjetosComLinha_(aba, incluirExcluidos) {
  const meta = metaAba_(aba);
  const sh = meta.sh;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  const vals = sh.getRange(2, 1, lastRow - 1, meta.lastCol).getDisplayValues();
  return vals.map(function (row, idx) {
    return objetoDaLinha_(meta.headers, row, idx + 2);
  }).filter(function (o) {
    return (incluirExcluidos || normalizar_(o.EXCLUIDO) !== 'SIM') && meta.headers.some(function (h) { return h && texto_(o[h]); });
  });
}

function agruparLinhasContiguas_(linhas) {
  const nums = unicos_((linhas || []).map(Number).filter(function (n) { return n >= 2; })).sort(function (a, b) { return a - b; });
  const grupos = [];
  nums.forEach(function (n) {
    const g = grupos[grupos.length - 1];
    if (!g || n !== g.fim + 1) grupos.push({ inicio: n, fim: n });
    else g.fim = n;
  });
  return grupos;
}

function linhasPorValor_(aba, coluna, valor) {
  const meta = metaAba_(aba);
  const idx = meta.mapa[normalizarHeader_(coluna)];
  if (idx == null) return [];
  const lastRow = meta.sh.getLastRow();
  if (lastRow < 2) return [];
  const range = meta.sh.getRange(2, idx + 1, lastRow - 1, 1);
  const alvo = texto_(valor);
  if (range.createTextFinder) {
    const finder = range.createTextFinder(alvo).matchEntireCell(true);
    const achados = finder.findAll ? finder.findAll() : [];
    if (achados && achados.length) return achados.map(function (c) { return c.getRow(); });
    if (finder.findNext) {
      const one = finder.findNext();
      return one ? [one.getRow()] : [];
    }
  }
  return range.getDisplayValues().map(function (r, i) { return texto_(r[0]) === alvo ? i + 2 : 0; }).filter(Boolean);
}

function lerObjetosLinhas_(aba, linhas) {
  const meta = metaAba_(aba);
  const saida = [];
  agruparLinhasContiguas_(linhas).forEach(function (g) {
    const vals = meta.sh.getRange(g.inicio, 1, g.fim - g.inicio + 1, meta.lastCol).getDisplayValues();
    vals.forEach(function (row, i) { saida.push(objetoDaLinha_(meta.headers, row, g.inicio + i)); });
  });
  return saida.filter(function (o) { return normalizar_(o.EXCLUIDO) !== 'SIM'; });
}

function lerObjetosPorValorComLinha_(aba, coluna, valor) {
  return lerObjetosLinhas_(aba, linhasPorValor_(aba, coluna, valor));
}

function lerObjetosPorValoresComLinha_(aba, coluna, valores) {
  const linhas = [];
  unicos_((valores || []).map(texto_).filter(Boolean)).forEach(function (v) {
    linhas.push.apply(linhas, linhasPorValor_(aba, coluna, v));
  });
  return lerObjetosLinhas_(aba, unicos_(linhas));
}

function garantirCabecalhosAba_(aba, chavesExtras) {
  let meta = metaAba_(aba);
  const obrigatorios = (APP.CABECALHOS[aba] || []).concat(chavesExtras || []).map(texto_).filter(Boolean);
  if (!obrigatorios.length) return meta.sh;
  const existentes = meta.headers.map(normalizarHeader_);
  const faltantes = [];
  obrigatorios.forEach(function (h) {
    const n = normalizarHeader_(h);
    if (n && existentes.indexOf(n) === -1 && !faltantes.some(function (x) { return normalizarHeader_(x) === n; })) faltantes.push(h);
  });
  if (faltantes.length) {
    meta.sh.getRange(1, meta.sh.getLastColumn() + 1, 1, faltantes.length).setValues([faltantes]);
    delete __META_ABAS_CACHE[aba];
    meta = metaAba_(aba, true);
  }
  return meta.sh;
}

function anexarObjetos_(aba, objetos) {
  if (!objetos || !objetos.length) return;
  const extras = [];
  objetos.forEach(function (o) {
    Object.keys(o || {}).forEach(function (k) { if (k !== '__linha' && extras.indexOf(k) === -1) extras.push(k); });
  });
  const sh = garantirCabecalhosAba_(aba, extras);
  const meta = metaAba_(aba, true);
  const rows = objetos.map(function (o) {
    return meta.headers.map(function (h) { const v = o[h]; return v == null ? '' : v; });
  });
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, meta.headers.length).setValues(rows);
}

function patchLinhas_(aba, atualizacoes) {
  atualizacoes = (atualizacoes || []).filter(function (x) { return x && Number(x.linha) >= 2 && x.patch; });
  if (!atualizacoes.length) return;
  const extras = [];
  atualizacoes.forEach(function (x) { Object.keys(x.patch).forEach(function (k) { if (k !== '__linha' && extras.indexOf(k) === -1) extras.push(k); }); });
  garantirCabecalhosAba_(aba, extras);
  const meta = metaAba_(aba, true);
  const indices = extras.map(function (k) { return meta.mapa[normalizarHeader_(k)]; });
  const ausentes = extras.filter(function (k, i) { return indices[i] == null; });
  if (ausentes.length) throw new Error('Falha de estrutura ao gravar na aba ' + aba + '. Colunas não encontradas: ' + ausentes.join(', '));

  const porLinha = {};
  atualizacoes.forEach(function (x) {
    const linha = Number(x.linha);
    porLinha[linha] = Object.assign(porLinha[linha] || {}, x.patch);
  });
  const linhas = Object.keys(porLinha).map(Number).sort(function (a, b) { return a - b; });
  const minCol = Math.min.apply(null, indices), maxCol = Math.max.apply(null, indices);
  agruparLinhasContiguas_(linhas).forEach(function (g) {
    const range = meta.sh.getRange(g.inicio, minCol + 1, g.fim - g.inicio + 1, maxCol - minCol + 1);
    const vals = range.getValues();
    for (let rowNum = g.inicio; rowNum <= g.fim; rowNum++) {
      const patch = porLinha[rowNum];
      if (!patch) continue;
      Object.keys(patch).forEach(function (k) {
        if (k === '__linha') return;
        const col = meta.mapa[normalizarHeader_(k)];
        vals[rowNum - g.inicio][col - minCol] = patch[k];
      });
    }
    range.setValues(vals);
  });
}

function patchLinha_(aba, linha, patch) {
  patchLinhas_(aba, [{ linha: linha, patch: patch }]);
}

function buscarPorId_(aba, coluna, id) {
  const linhas = linhasPorValor_(aba, coluna, id);
  if (!linhas.length) return null;
  return lerObjetosLinhas_(aba, [linhas[0]])[0] || null;
}

function localizarVeiculo_(veiculos, valor) {
  const alvo = tokensVeiculo_(valor);
  if (!alvo.chave && !alvo.numero && !alvo.placa) return null;
  const candidatos = (veiculos || []).filter(function (v) {
    return veiculosEquivalentes_(v, { VEICULO_ID: alvo.numero, VEICULO: valor, PLACA: alvo.placa });
  });
  if (!candidatos.length) return null;
  return candidatos.sort(function (a, b) { return pontuarVeiculo_(b) - pontuarVeiculo_(a); })[0];
}

function consolidarVeiculos_(veiculos) {
  const saida = [];
  (veiculos || []).filter(function (v) { return normalizar_(v.ATIVO || 'SIM') !== 'NAO'; }).forEach(function (v) {
    const idx = saida.findIndex(function (x) { return veiculosEquivalentes_(x, v); });
    if (idx < 0) saida.push(v);
    else if (pontuarVeiculo_(v) > pontuarVeiculo_(saida[idx])) saida[idx] = v;
  });
  return saida;
}

function veiculosEquivalentes_(a, b) {
  const ta = tokensVeiculoObj_(a), tb = tokensVeiculoObj_(b);
  if (ta.placa && tb.placa && ta.placa === tb.placa) return true;
  if (ta.numero && tb.numero && ta.numero === tb.numero) return true;
  return !!(ta.chave && tb.chave && ta.chave === tb.chave);
}

function tokensVeiculoObj_(v) {
  const dados = [v && v.VEICULO_ID, v && v.VEICULO, v && v.PLACA].map(tokensVeiculo_);
  return {
    numero: dados.map(function (x) { return x.numero; }).find(Boolean) || '',
    placa: dados.map(function (x) { return x.placa; }).find(Boolean) || '',
    chave: dados.map(function (x) { return x.chave; }).find(Boolean) || ''
  };
}

function tokensVeiculo_(valor) {
  const n = normalizar_(valor);
  const compacto = n.replace(/[^A-Z0-9]/g, '');
  const placaMatch = compacto.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/);
  let numero = '';
  const carro = n.match(/\bCARRO\s*0*(\d{1,5})\b/);
  const puro = n.match(/^0*(\d{1,5})$/);
  const junto = compacto.match(/^0*(\d{1,5})(?=[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$)/);
  if (carro) numero = String(Number(carro[1]));
  else if (puro) numero = String(Number(puro[1]));
  else if (junto) numero = String(Number(junto[1]));
  return { numero: numero, placa: placaMatch ? placaMatch[0] : '', chave: vehicleKey_(valor) };
}

function pontuarVeiculo_(v) {
  let p = 0;
  if (/^\d+$/.test(texto_(v.VEICULO_ID))) p += 8;
  if (tokensVeiculo_(v.PLACA).placa) p += 10;
  if (/^CARRO\s+\d+$/i.test(texto_(v.VEICULO))) p += 5;
  if (!/CRIADO AUTOMATICAMENTE/i.test(texto_(v.OBSERVAÇÃO))) p += 3;
  return p;
}

function rotuloVeiculo_(v) {
  const t = tokensVeiculoObj_(v || {});
  const nome = t.numero ? 'CARRO ' + t.numero : texto_(v && v.VEICULO).toUpperCase();
  return t.placa ? nome + ' (' + t.placa + ')' : nome;
}

function vehicleKey_(v) {
  return normalizar_(v).replace(/^CARRO\s*/, '').replace(/[^A-Z0-9]/g, '').replace(/^0+(?=\d)/, '');
}

function compararRotas_(a, b) {
  const da = texto_(a.DATA_OPERACIONAL);
  const db = texto_(b.DATA_OPERACIONAL);
  if (da !== db) return db.localeCompare(da);
  const ta = turnoPeso_(a.TURNO), tb = turnoPeso_(b.TURNO);
  if (ta !== tb) return tb - ta;
  return texto_(b.DATA_IMPORTACAO).localeCompare(texto_(a.DATA_IMPORTACAO));
}

function turnoPeso_(t) {
  t = normalizar_(t);
  return t === 'MANHA' ? 1 : t === 'TARDE' ? 2 : 3;
}

function agora_() {
  return Utilities.formatDate(new Date(), APP.TZ, 'yyyy-MM-dd HH:mm:ss');
}

function novoId_(prefixo) {
  return prefixo + '-' + Utilities.formatDate(new Date(), APP.TZ, 'yyyyMMddHHmmss') + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
}

function novoIdRota_(data, veiculo, carga) {
  const d = texto_(data).replace(/-/g, '');
  const v = vehicleKey_(veiculo).slice(0, 8) || 'VEIC';
  const c = normalizar_(carga).replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'CARGA';
  return 'R-' + d + '-' + v + '-' + c + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 4).toUpperCase();
}

function normalizarUsuario_(v) {
  return texto_(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function normalizar_(v) {
  return texto_(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function normalizarHeader_(v) {
  return normalizar_(v).replace(/[^A-Z0-9]/g, '');
}

function texto_(v) {
  return String(v == null ? '' : v).trim().replace(/\s+/g, ' ');
}

function listaTexto_(v) {
  return texto_(v).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

function unicos_(arr) {
  const seen = {};
  return (arr || []).filter(function (x) {
    x = texto_(x);
    if (!x || seen[x]) return false;
    seen[x] = true;
    return true;
  });
}

function pad2_(n) {
  return ('0' + n).slice(-2);
}


// Somente eventos operacionais reiniciam o relógio; revisões não mascaram atrasos.
let __MARCOS_ROTAS;
function ultimoMarcoRota_(r) {
  if (!__MARCOS_ROTAS) {
    __MARCOS_ROTAS = {};
    lerObjetos_(APP.ABAS.EVENTOS).forEach(function (e) {
      if (normalizar_(e['AÇÃO']) === 'MOTORISTA_DIVERGENTE') return;
      if (normalizar_(e.ORIGEM) !== 'MOTORISTA' && !['ROTA_LIBERADA','ROTA_LIBERADA_EM_MASSA','ETAPA_RECALCULADA'].includes(normalizar_(e['AÇÃO']))) return;
      const id = texto_(e.ROTA_ID), hora = texto_(e.DATA_HORA);
      if (hora > (__MARCOS_ROTAS[id] || '')) __MARCOS_ROTAS[id] = hora;
    });
  }
  return __MARCOS_ROTAS[texto_(r.ROTA_ID)] || texto_(r.RETORNO_CD_EM || r.SAIDA_EM || r.LIBERADA_EM || r.DATA_IMPORTACAO);
}

function adicionarEntregaAvulsa(token, payload) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const p = payload || {}, r = buscarPorId_(APP.ABAS.ROTAS, 'ROTA_ID', texto_(p.rotaId));
    if (!r) throw new Error('Carregamento não encontrado.');
    if (![APP.STATUS_ROTA.AGUARDANDO, APP.STATUS_ROTA.LIBERADA].includes(normalizar_(r.STATUS_ROTA))) throw new Error('Inclua a entrega avulsa antes da saída do veículo.');
    const campos = ['pedido','filial','cliente','endereco','bairro','cidade','uf','telefone','motivo'];
    campos.forEach(function (k) { p[k] = texto_(p[k]); if (!p[k] || p[k].length > 500 || /^=/.test(p[k])) throw new Error('Preencha corretamente: ' + k + '.'); });
    if (/[,;\n]/.test(p.pedido)) throw new Error('Cadastre um pedido por vez.');
    if (!/^[A-Za-z]{2}$/.test(p.uf)) throw new Error('Informe a UF com duas letras.');
    const chave = chavePedidoImportacao_({Pedido:p.pedido,Filial:p.filial});
    const historico = lerObjetos_(APP.ABAS.PEDIDOS, true).filter(function (x) { return chavePedidoImportacao_(x) === chave; });
    if (historico.some(function (x) { return normalizar_(x.EXCLUIDO) !== 'SIM' && normalizar_(x.STATUS_PEDIDO) !== APP.STATUS_ENTREGA.RETORNO; })) throw new Error('Pedido já cadastrado e sem retorno disponível. Não é permitido duplicar uma entrega ativa ou concluída.');
    const es = lerObjetosPorValorComLinha_(APP.ABAS.ENTREGAS, 'ROTA_ID', r.ROTA_ID);
    const id = novoId_('E'), agora = agora_();
    const entrega = {ENTREGA_ID:id,ROTA_ID:r.ROTA_ID,VEICULO:r.VEICULO,CARREGAMENTO:r.CARREGAMENTO,TURNO:r.TURNO,CLIENTE:p.cliente,CODIGO_CLIENTE:texto_(p.codigoCliente),ENDERECO_COMPLETO:p.endereco,BAIRRO:p.bairro,CIDADE:p.cidade,UF:p.uf.toUpperCase(),CEP:texto_(p.cep),TELEFONE:p.telefone,QTDE_PEDIDOS:1,PEDIDOS:p.pedido,PEDIDOS_ANTIGOS:p.pedido,ORDEM_MANUAL:Math.max(0,...es.map(function(e){return Number(e.ORDEM_MANUAL)||0;}))+1,STATUS_ENTREGA:APP.STATUS_ENTREGA.PENDENTE,ETAPA_ATUAL:r.STATUS_ROTA,ORIGEM_CADASTRO:'AVULSA_RETORNO'};
    const pedido = {Pedido:p.pedido,Filial:p.filial,Cliente:p.cliente,'Código':texto_(p.codigoCliente),'Endereço Entrega':p.endereco,Bairro:p.bairro,Cidade:p.cidade,UF:p.uf.toUpperCase(),CEP:texto_(p.cep),'Telefone Entrega':p.telefone,Motorista:r.MOTORISTA_REAL,Veiculo:r.VEICULO,Carregamento:r.CARREGAMENTO,IMPORTACAO_ID:'MANUAL',ROTA_ID:r.ROTA_ID,ENTREGA_ID:id,TIPO_PEDIDO:'RETORNO_AVULSO',DATA_SUGERIDA:r.DATA_OPERACIONAL,DATA_OPERACIONAL:r.DATA_OPERACIONAL,STATUS_PEDIDO:r.STATUS_ROTA,TENTATIVA_ATUAL:Math.max(0,...historico.map(function(x){return Number(x.TENTATIVA_ATUAL)||1;}))+1,OBSERVACAO_AVULSA:p.motivo};
    anexarObjetos_(APP.ABAS.PEDIDOS,[pedido]);
    anexarObjetos_(APP.ABAS.ENTREGAS,[entrega]);
    // Um novo destino não pode herdar uma unificação manual com outro cliente.
    const grupo = texto_(r.GRUPO_PARADA_ID);
    if (grupo) patchLinha_(APP.ABAS.ROTAS,r.__linha,{GRUPO_PARADA_ID:''});
    const outra = grupo ? limparGrupoParadaSolto_(grupo) : '';
    registrarEvento_(r.ROTA_ID,id,r.VEICULO,r.MOTORISTA_REAL,'CADASTRO','ENTREGA_AVULSA_CRIADA','Pedido '+p.pedido+' / filial '+p.filial+'; motivo: '+p.motivo,sessao.usuario,'CENTRAL');
    return respostaCentralRotas_([r.ROTA_ID,outra]);
  } finally { lock.releaseLock(); }
}

function excluirPedidoRota(token, entregaId, pedido, motivo) {
  const sessao = exigirSessao_(token, 'ROTEIRIZADOR');
  motivo = texto_(motivo); pedido = texto_(pedido);
  if (!motivo || motivo.length > 500) throw new Error('Informe o motivo da exclusão (até 500 caracteres).');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const e = buscarPorId_(APP.ABAS.ENTREGAS,'ENTREGA_ID',entregaId);
    if (!e || !listaTexto_(e.PEDIDOS).includes(pedido)) throw new Error('Pedido não está mais nesta entrega. Atualize o painel.');
    const r = buscarPorId_(APP.ABAS.ROTAS,'ROTA_ID',e.ROTA_ID);
    if (!r) throw new Error('Rota não encontrada.');
    const linhas = lerObjetosPorValorComLinha_(APP.ABAS.PEDIDOS,'ENTREGA_ID',entregaId).filter(function(x){return texto_(x.Pedido)===pedido;});
    if (!linhas.length) throw new Error('Pedido sem vínculo na base. Verifique o cadastro antes de excluir.');
    const patch = {EXCLUIDO:'SIM',EXCLUIDO_EM:agora_(),EXCLUIDO_POR:sessao.usuario,MOTIVO_EXCLUSAO:motivo};
    patchLinhas_(APP.ABAS.PEDIDOS,linhas.map(function(x){return {linha:x.__linha,patch:patch};}));
    const restantes = listaTexto_(e.PEDIDOS).filter(function(n){return n!==pedido;});
    patchLinha_(APP.ABAS.ENTREGAS,e.__linha,restantes.length ? {PEDIDOS:restantes.join(', '),QTDE_PEDIDOS:restantes.length,PEDIDOS_ANTIGOS:listaTexto_(e.PEDIDOS_ANTIGOS).filter(function(n){return n!==pedido;}).join(', ')} : patch);
    // Carga vazia volta à conferência antes da saída; em trânsito segue disponível para retorno ao CD.
    if (!lerObjetosPorValorComLinha_(APP.ABAS.ENTREGAS,'ROTA_ID',r.ROTA_ID).length && [APP.STATUS_ROTA.AGUARDANDO,APP.STATUS_ROTA.LIBERADA].includes(normalizar_(r.STATUS_ROTA))) patchLinha_(APP.ABAS.ROTAS,r.__linha,{STATUS_ROTA:APP.STATUS_ROTA.AGUARDANDO,LIBERADA_EM:'',MOTORISTA_CONFIRMADO:'PENDENTE'});
    registrarEvento_(r.ROTA_ID,entregaId,r.VEICULO,r.MOTORISTA_REAL,'EXCLUSAO','PEDIDO_EXCLUIDO','Pedido '+pedido+'; status anterior: '+e.STATUS_ENTREGA+'; motivo: '+motivo,sessao.usuario,'CENTRAL');
    if (!restantes.length && ['A_CAMINHO','NO_CLIENTE'].includes(normalizar_(e.STATUS_ENTREGA))) registrarEvento_(r.ROTA_ID,entregaId,r.VEICULO,r.MOTORISTA_REAL,'ROTA','ETAPA_RECALCULADA','Parada ativa removida pela Central.',sessao.usuario,'CENTRAL');
    return respostaCentralRotas_([r.ROTA_ID]);
  } finally { lock.releaseLock(); }
}

/** Rota Simples → Pendências de Entrega 3.5.
 * Adicione como NOVO arquivo .gs no projeto Rota Simples. Não altere o projeto Pendências.
 * Esta integração grava no esquema existente; valide primeiro numa cópia de teste.
 */
const PEND_ROTA = Object.freeze({
  PLANILHA_ID: '1svg8JQ5bnM4Y5-V6JcO82XMH5oXxsOqrjEReweqZy2o',
  FUSO: 'America/Fortaleza',
  UNIDADES: ['UND', 'CAIXA', 'PEÇA'],
  FOTOS: ['image/jpeg', 'image/png', 'image/webp'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/quicktime'],
  ABAS: {
    OCORRENCIAS: ['ID_OCORRENCIA','DATA_HORA_REGISTRO','ID_MOTORISTA','MOTORISTA','ID_VEICULO','CARRO','NF_PEDIDO','MOTIVO','OBSERVACAO_MOTORISTA','STATUS','QUANTIDADE_ITENS','ID_USUARIO_SAC','RESPONSAVEL_SAC','DATA_HORA_INICIO_ANALISE','SOLUCAO_SAC','DATA_HORA_RESOLUCAO','ULTIMA_ATUALIZACAO','TOKEN_ENVIO'],
    ITENS_OCORRENCIA: ['ID_ITEM','ID_OCORRENCIA','SEQUENCIA','MATERIAL','QUANTIDADE','FOTO_NOME','FOTO_URL','FOTO_ID','DATA_HORA_REGISTRO','LOTE','UNIDADE'],
    ANEXOS_ITENS_ROTA: ['ID_ANEXO_ITEM','ID_OCORRENCIA','ID_ITEM','TIPO','NOME','URL','ARQUIVO_ID','TIPO_MIME','DATA_HORA_REGISTRO'],
    HISTORICO: ['ID_HISTORICO','ID_OCORRENCIA','DATA_HORA','ID_USUARIO','USUARIO','PERFIL','ACAO','DETALHES']
  }
});

function pendRotaPlanilha_() { return SpreadsheetApp.openById(PEND_ROTA.PLANILHA_ID); }
function pendRotaAba_(ss, nome, campos) {
  const sh = ss.getSheetByName(nome);
  if (!sh) throw new Error('A aba de Pendências ' + nome + ' não existe.');
  const cabe = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const idx = {};
  cabe.forEach((x,i) => { idx[String(x).trim().toUpperCase()] = i; });
  (campos || []).forEach(x => { if (idx[x] === undefined) throw new Error('Coluna necessária não encontrada: ' + nome + '.' + x); });
  return { sh, idx, colunas: cabe.length };
}
function pendRotaLinhas_(ss, nome, campos) {
  const a = pendRotaAba_(ss, nome, campos);
  const n = a.sh.getLastRow();
  return n > 1 ? a.sh.getRange(2, 1, n - 1, a.colunas).getValues() : [];
}
function pendRotaCfg_(ss) {
  const c = {};
  pendRotaLinhas_(ss, 'CONFIG', ['CHAVE','VALOR']).forEach(r => { c[String(r[0])] = String(r[1] == null ? '' : r[1]); });
  if (!c.PASTA_RAIZ_ID || !c.PASTA_TEMP_ID) throw new Error('Configure as pastas existentes do sistema Pendências.');
  return c;
}
function pendRotaNorm_(x) { return String(x == null ? '' : x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/\s+/g, ' '); }
function pendRotaTexto_(x,max) { return String(x == null ? '' : x).trim().slice(0,max || 500); }
function pendRotaId_(prefixo) { return prefixo + '-' + Utilities.getUuid().replace(/-/g,'').slice(0,12).toUpperCase(); }
function pendRotaNumeroCarro_(x) {
  const n = pendRotaNorm_(x);
  const m = n.match(/\bCARRO\s*0*(\d{1,3})\b/) || n.match(/^0*(\d{1,3})(?=\s|[A-Z]{3}[0-9]|$)/);
  return m ? String(Number(m[1])) : '';
}
function pendRotaPlacas_(...partes) {
  return [...new Set(partes.flatMap(x => pendRotaNorm_(x).match(/\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/g) || []))];
}
/** Resolve o ID existente do SAC mesmo quando a placa está na identificação (ex.: '08 POC9G01'). */
function pendRotaVincularVeiculo_(carros, descricao, placaInformada) {
  const numero = pendRotaNumeroCarro_(descricao);
  const placasRota = pendRotaPlacas_(descricao, placaInformada);
  if (placasRota.length > 1) throw new Error('Há placas divergentes no veículo da rota. Confira o cadastro da Central.');
  const placa = placasRota[0] || '';
  if (!numero && !placa) throw new Error('Carro da rota sem número ou placa identificável.');
  const dados = carros.map(v => ({
    veiculo: v, numero: pendRotaNumeroCarro_(v.IDENTIFICACAO), placas: pendRotaPlacas_(v.IDENTIFICACAO, v.PLACA)
  }));
  const porPlaca = placa ? dados.filter(v => v.placas.includes(placa)) : [];
  const porNumero = numero ? dados.filter(v => v.numero === numero) : [];
  const exatos = dados.filter(v => (!numero || v.numero === numero) && (!placa || v.placas.includes(placa)));
  if (exatos.length === 1) return exatos[0].veiculo;
  if (exatos.length > 1) throw new Error('Mais de um veículo corresponde ao carro ' + descricao + ' na base do SAC.');
  if (porPlaca.length === 1 && (!numero || !porPlaca[0].numero || porPlaca[0].numero === numero)) return porPlaca[0].veiculo;
  if (porNumero.length === 1 && (!placa || !porNumero[0].placas.length)) return porNumero[0].veiculo;
  const conflito = porPlaca.length || porNumero.length;
  throw new Error(conflito
    ? 'O carro ' + descricao + ' apresenta placa/número divergente ou cadastro duplicado no SAC. Confira os cadastros antes de registrar.'
    : 'O carro ' + descricao + ' não está cadastrado como ativo no SAC. Cadastre ou reative o veículo para preservar o tratamento das pendências.');
}
function pendRotaCadastro_(ss, nome, chaves) {
  const a = pendRotaAba_(ss, nome, chaves);
  return pendRotaLinhas_(ss, nome, chaves)
    .map(r => Object.fromEntries(chaves.map(k => [k, r[a.idx[k]]])))
    .filter(r => r.ATIVO === true || pendRotaNorm_(r.ATIVO) === 'SIM' || pendRotaNorm_(r.ATIVO) === 'TRUE');
}
/** Vínculos explícitos. A rota define o nome oficial; o ID antigo é conservado somente quando inequívoco. */
const PEND_ROTA_ALIASES = Object.freeze({
  'LUCAS ALMEIDA NUNES': 'LUCAS NUNES',
  'MARCOS ANTONIO CORREIRA DA SILVA': 'MARCOS ANTONIO',
  'JOSE FRANCISCO ARRAES VALE': 'FCO ARRAIS',
  'LIDIANO ALBINO DOS SANTOS': 'LIDIANO',
  'MIQUEIAS PIMENTEL MONTEIRO': 'MIQUEIAS',
  'FRANCISCO AIRTON DE OLIVEIRA': 'AIRTON',
  'ALISSON JOSE GOMES BARBOSA': 'ALISSON JOSE',
  'JAILSON DE JESUS LIMA TEIXEIRA': 'JAILSON',
  'WILSON BEZERRA CAVALCANTE FILHO': 'WILSON'
});

function pendRotaIdentidadeMotorista_(ss, nomeRota) {
  const nome = pendRotaTexto_(nomeRota,120), chave = pendRotaNorm_(nome);
  if (!chave || ['PENDENTE','A DEFINIR','NAO INFORMADO'].includes(chave))
    throw new Error('O motorista precisa estar identificado e confirmado na rota.');
  const cadastrados = pendRotaCadastro_(ss,'MOTORISTAS',['ID_MOTORISTA','NOME','ATIVO']);
  const exatos = cadastrados.filter(m => pendRotaNorm_(m.NOME) === chave);
  const alias = PEND_ROTA_ALIASES[chave];
  const encontrados = exatos.length ? exatos : alias ? cadastrados.filter(m => pendRotaNorm_(m.NOME) === alias) : [];
  if (encontrados.length > 1) throw new Error('Há mais de um motorista correspondente no cadastro SAC: ' + nome);
  const id = encontrados.length ? String(encontrados[0].ID_MOTORISTA) : 'ROTA-' + Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, chave)
    .slice(0,10).map(n => (n & 255).toString(16).padStart(2,'0')).join('').toUpperCase();
  return {ID_MOTORISTA:id, NOME:nome, VINCULO_SAC:encontrados.length ? String(encontrados[0].NOME) : ''};
}

function pendRotaContexto_(token, paradaId, ss) {
  const sessao = exigirSessao_(token, 'MOTORISTA');
  const p = localizarParadaMotorista_(sessao, paradaId);
  if (!p || p.rotas.some(r => pendRotaNorm_(r.MOTORISTA_CONFIRMADO) !== 'SIM'))
    throw new Error('Inicie a jornada e confirme o motorista antes de registrar pendências.');
  if (p.rotas.some(r => normalizarTipoOperacao_(r.TIPO_OPERACAO) === 'COLETA_LOJA_CD') ||
      p.entregas.some(e => pendRotaNorm_(e.STATUS_ENTREGA) !== APP.STATUS_ENTREGA.ENTREGUE))
    throw new Error('Registre a pendência somente após confirmar a entrega realizada de todos os pedidos desta parada.');
  const nomes = [...new Set(p.rotas.map(r => pendRotaTexto_(r.MOTORISTA_REAL,120)).filter(Boolean))];
  if (new Set(nomes.map(pendRotaNorm_)).size !== 1 || !nomes.length)
    throw new Error('Motorista da rota não identificado de forma única. A Central precisa corrigir o cadastro.');
  const motorista = pendRotaIdentidadeMotorista_(ss,nomes[0]);
  const carros = pendRotaCadastro_(ss,'VEICULOS',['ID_VEICULO','IDENTIFICACAO','PLACA','ATIVO']);
  const descricaoRota = sessao.veiculo || p.rotas[0].VEICULO;
  const carro = pendRotaVincularVeiculo_(carros, descricaoRota, sessao.placa || p.rotas[0].PLACA);
  const motivos = pendRotaCadastro_(ss,'MOTIVOS',['ID_MOTIVO','MOTIVO','ATIVO','ORDEM'])
    .sort((a,b) => Number(a.ORDEM || 999) - Number(b.ORDEM || 999));
  if (!motivos.length) throw new Error('Não existem motivos ativos no sistema Pendências.');
  const pedidos = [...new Set(p.entregas.flatMap(e => listaTexto_(e.PEDIDOS)).map(x=>pendRotaTexto_(x,80)).filter(Boolean))];
  if (!pedidos.length) throw new Error('Esta parada não possui pedidos vinculados.');
  return { sessao, p, motorista, carro, motivos, pedidos };
}

/** Lê opções já cadastradas no sistema Pendências; não altera nenhuma configuração. */
function obterFormularioPendenciaRota(token, paradaId) {
  const ss = pendRotaPlanilha_(), c = pendRotaContexto_(token, paradaId, ss), cfg = pendRotaCfg_(ss);
  return {
    paradaId, motorista: String(c.motorista.NOME), carro: String(c.carro.IDENTIFICACAO),
    pedidos: c.pedidos, motivos: c.motivos.map(m => ({ id:String(m.ID_MOTIVO), nome:String(m.MOTIVO) })),
    maxItens: Math.max(1, Math.min(12, Number(cfg.MAX_ITENS_OCORRENCIA || 12))),
    maxFotoMb: Number(cfg.MAX_FOTO_MB || 2), maxVideoMb: Number(cfg.MAX_VIDEO_MB || 15)
  };
}

/** Um arquivo por chamada para não ultrapassar o tamanho de envio do Apps Script. */
function uploadArquivoPendenciaRota(token, paradaId, tokenEnvio, tipo, arquivo) {
  if (!/^[A-Za-z0-9_-]{12,160}$/.test(String(tokenEnvio || ''))) throw new Error('Identificador de envio inválido.');
  if (!['MATERIAL','PEDIDO'].includes(tipo)) throw new Error('Tipo de arquivo inválido.');
  const ss = pendRotaPlanilha_(), c = pendRotaContexto_(token, paradaId, ss), cfg = pendRotaCfg_(ss);
  const match = String(arquivo && arquivo.dataUrl || '').match(/^data:([\w.+/-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error('Arquivo inválido: selecione uma foto ou vídeo.');
  const mime = match[1].toLowerCase(), imagem = PEND_ROTA.FOTOS.includes(mime);
  if (!imagem && !(tipo === 'MATERIAL' && PEND_ROTA.VIDEOS.includes(mime))) throw new Error('Formato não permitido para ' + tipo + '.');
  const limite = (imagem ? Number(cfg.MAX_FOTO_MB || 2) : Number(cfg.MAX_VIDEO_MB || 15)) * 1048576;
  if (match[2].length * .75 > limite + 2) throw new Error('Arquivo maior que o limite permitido.');
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > limite) throw new Error('Arquivo maior que ' + Math.floor(limite/1048576) + ' MB.');
  const pasta = DriveApp.getFolderById(cfg.PASTA_TEMP_ID);
  const nome = pendRotaTexto_(arquivo.nome,150).replace(/[\\/<>:"|?*\r\n]/g,'_') || ('arquivo_' + Date.now());
  const f = pasta.createFile(Utilities.newBlob(bytes,mime,nome));
  f.setDescription(JSON.stringify({app:'ROTA_SIMPLES_PEND',ownerId:String(c.motorista.ID_MOTORISTA),veiculoId:String(c.carro.ID_VEICULO),paradaId,tokenEnvio,tipo,criadoEm:Date.now()}));
  return {arquivoId:f.getId(),nome:f.getName()};
}
function pendRotaArquivo_(id,cfg,c,tipo,tokenEnvio,ids) {
  id = pendRotaTexto_(id,160);
  if (!id || ids.has(id)) throw new Error('Cada material exige dois arquivos diferentes.');
  ids.add(id);
  let f;
  try { f = DriveApp.getFileById(id); } catch (_) { throw new Error('Arquivo temporário não encontrado. Envie novamente.'); }
  const pais = f.getParents(); let temporario = false;
  while (pais.hasNext()) if (pais.next().getId() === cfg.PASTA_TEMP_ID) temporario = true;
  if (!temporario) throw new Error('O arquivo não está na pasta temporária de Pendências.');
  let meta = {};
  try { meta = JSON.parse(f.getDescription() || '{}'); } catch (_) {}
  if (meta.app !== 'ROTA_SIMPLES_PEND' || meta.ownerId !== String(c.motorista.ID_MOTORISTA) ||
      meta.veiculoId !== String(c.carro.ID_VEICULO) || meta.paradaId !== c.p.id || meta.tokenEnvio !== tokenEnvio || meta.tipo !== tipo)
    throw new Error('Arquivo não pertence a esta pendência. Selecione novamente.');
  const mime = String(f.getMimeType() || '').toLowerCase();
  if (!PEND_ROTA.FOTOS.includes(mime) && !(tipo === 'MATERIAL' && PEND_ROTA.VIDEOS.includes(mime))) throw new Error('Formato de anexo inválido.');
  return f;
}
function pendRotaExt_(mime) { return ({'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','video/mp4':'.mp4','video/webm':'.webm','video/quicktime':'.mov'})[mime] || '.bin'; }
function pendRotaSubpasta_(pai,nome) { const pastas = pai.getFoldersByName(nome); return pastas.hasNext() ? pastas.next() : pai.createFolder(nome); }
function pendRotaAppend_(ss,nome,valores) {
  const a = pendRotaAba_(ss,nome,PEND_ROTA.ABAS[nome]);
  const row = Array(a.colunas).fill('');
  Object.keys(valores).forEach(k => { if (a.idx[k] === undefined) throw new Error('Coluna não encontrada: ' + nome + '.' + k); row[a.idx[k]] = valores[k]; });
  a.sh.appendRow(row);
}
function pendRotaLocalizar_(ss,nome,coluna,valor) {
  const a = pendRotaAba_(ss,nome,[coluna]);
  const n = a.sh.getLastRow();
  if (n < 2) return 0;
  const achou = a.sh.getRange(2,a.idx[coluna]+1,n-1,1).createTextFinder(String(valor)).matchEntireCell(true).findNext();
  return achou ? achou.getRow() : 0;
}
function pendRotaRemoverLinha_(ss,nome,campo,id) {
  const pos = pendRotaLocalizar_(ss,nome,campo,id);
  if (pos) ss.getSheetByName(nome).deleteRow(pos);
}
/** Grava itens, fotos e histórico antes da ocorrência principal, evitando registros incompletos visíveis ao SAC. */
function registrarPendenciaRota(token,dados) {
  dados = dados || {};
  const tokenEnvio = String(dados.tokenEnvio || '');
  if (!/^[A-Za-z0-9_-]{12,160}$/.test(tokenEnvio)) throw new Error('Identificador de envio inválido.');
  const ss = pendRotaPlanilha_(), c = pendRotaContexto_(token, String(dados.paradaId || ''), ss), cfg = pendRotaCfg_(ss);
  const pedido = pendRotaTexto_(dados.nfPedido,80);
  if (!c.pedidos.includes(pedido)) throw new Error('Selecione um pedido vinculado a esta parada.');
  const motivo = c.motivos.find(m => String(m.ID_MOTIVO) === String(dados.motivoId));
  if (!motivo) throw new Error('Selecione um motivo ativo do SAC.');
  const observacao = pendRotaTexto_(dados.observacao,1300);
  if (pendRotaNorm_(motivo.MOTIVO) === 'OUTRO' && !observacao) throw new Error('Explique o motivo na observação.');
  const itens = dados.itens;
  if (!Array.isArray(itens) || !itens.length || itens.length > Math.min(12,Number(cfg.MAX_ITENS_OCORRENCIA || 12)))
    throw new Error('Informe de 1 a ' + cfg.MAX_ITENS_OCORRENCIA + ' materiais.');
  const avaliados = itens.map((item,i) => {
    const material = pendRotaTexto_(item.material,500), quantidade = Number(String(item.quantidade || '').replace(',','.'));
    const unidade = pendRotaNorm_(item.unidade);
    if (!material || !Number.isFinite(quantidade) || quantidade <= 0 || !PEND_ROTA.UNIDADES.includes(unidade))
      throw new Error('Confira material, quantidade e unidade do item ' + (i+1) + '.');
    return { material, quantidade, unidade, fotoId:item.fotoId, pedidoFotoId:item.pedidoFotoId };
  });
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const existente = pendRotaLocalizar_(ss,'OCORRENCIAS','TOKEN_ENVIO',tokenEnvio);
    if (existente) return {sucesso:true,duplicada:true,protocolo:String(ss.getSheetByName('OCORRENCIAS').getRange(existente,1).getDisplayValue())};
    const ids = new Set();
    const arquivos = avaliados.map(x => ({material:pendRotaArquivo_(x.fotoId,cfg,c,'MATERIAL',tokenEnvio,ids),pedido:pendRotaArquivo_(x.pedidoFotoId,cfg,c,'PEDIDO',tokenEnvio,ids)}));
    const agora = new Date();
    // O sufixo R+hexadecimal evita colisões com a numeração sequencial do sistema original.
    const protocolo = 'OCR-' + Utilities.formatDate(agora,PEND_ROTA.FUSO,'yyyyMMdd') + '-R' + Utilities.getUuid().replace(/-/g,'').slice(0,10).toUpperCase();
    const raiz = DriveApp.getFolderById(cfg.PASTA_RAIZ_ID);
    const ano = Utilities.formatDate(agora,PEND_ROTA.FUSO,'yyyy');
    const mes = Utilities.formatDate(agora,PEND_ROTA.FUSO,'MM');
    const pasta = pendRotaSubpasta_(pendRotaSubpasta_(raiz,ano),mes).createFolder(protocolo);
    const idsItens = avaliados.map(()=>pendRotaId_('ITEM'));
    const idsAnexos = avaliados.map(()=>pendRotaId_('AIR'));
    const idHistorico = pendRotaId_('HIS');
    let gravouPrincipal = false;
    try {
      arquivos.forEach((a,i) => {
        const num = String(i+1).padStart(2,'0');
        a.material.setName(protocolo+'_MATERIAL_'+num+pendRotaExt_(a.material.getMimeType()));
        a.pedido.setName(protocolo+'_PEDIDO_'+num+pendRotaExt_(a.pedido.getMimeType()));
        a.material.moveTo(pasta); a.pedido.moveTo(pasta);
      });
      avaliados.forEach((item,i) => {
        const f = arquivos[i].material, fp = arquivos[i].pedido;
        pendRotaAppend_(ss,'ITENS_OCORRENCIA',{
          ID_ITEM:idsItens[i],ID_OCORRENCIA:protocolo,SEQUENCIA:i+1,MATERIAL:item.material,QUANTIDADE:item.quantidade,
          FOTO_NOME:f.getName(),FOTO_URL:f.getUrl(),FOTO_ID:f.getId(),DATA_HORA_REGISTRO:agora,LOTE:'',UNIDADE:item.unidade
        });
        pendRotaAppend_(ss,'ANEXOS_ITENS_ROTA',{
          ID_ANEXO_ITEM:idsAnexos[i],ID_OCORRENCIA:protocolo,ID_ITEM:idsItens[i],TIPO:'PEDIDO',
          NOME:fp.getName(),URL:fp.getUrl(),ARQUIVO_ID:fp.getId(),TIPO_MIME:fp.getMimeType(),DATA_HORA_REGISTRO:agora
        });
      });
      pendRotaAppend_(ss,'HISTORICO',{
        ID_HISTORICO:idHistorico,ID_OCORRENCIA:protocolo,DATA_HORA:agora,ID_USUARIO:String(c.motorista.ID_MOTORISTA),
        USUARIO:String(c.motorista.NOME),PERFIL:'MOTORISTA',ACAO:'OCORRÊNCIA REGISTRADA',
        DETALHES:avaliados.length+' material(is) — NF/Pedido '+pedido+' (via Rota Simples)'
      });
      SpreadsheetApp.flush();
      const descricaoRota = '[Rota Simples] Carregamento(s): ' + [...new Set(c.p.rotas.map(r=>String(r.CARREGAMENTO||'')).filter(Boolean))].join(', ') +
        '; Cliente: ' + pendRotaTexto_(c.p.entregas[0].CLIENTE,100) + '; ' + observacao;
      pendRotaAppend_(ss,'OCORRENCIAS',{
        ID_OCORRENCIA:protocolo,DATA_HORA_REGISTRO:agora,ID_MOTORISTA:String(c.motorista.ID_MOTORISTA),MOTORISTA:String(c.motorista.NOME),
        ID_VEICULO:String(c.carro.ID_VEICULO),CARRO:String(c.carro.IDENTIFICACAO)+(c.carro.PLACA?' — '+c.carro.PLACA:''),
        NF_PEDIDO:pedido,MOTIVO:String(motivo.MOTIVO),OBSERVACAO_MOTORISTA:descricaoRota.slice(0,1500),STATUS:'NOVA',
        QUANTIDADE_ITENS:avaliados.length,ID_USUARIO_SAC:'',RESPONSAVEL_SAC:'',DATA_HORA_INICIO_ANALISE:'',
        SOLUCAO_SAC:'',DATA_HORA_RESOLUCAO:'',ULTIMA_ATUALIZACAO:agora,TOKEN_ENVIO:tokenEnvio
      });
      gravouPrincipal = true;
      SpreadsheetApp.flush();
    } catch (erro) {
      if (!gravouPrincipal && !pendRotaLocalizar_(ss,'OCORRENCIAS','ID_OCORRENCIA',protocolo)) {
        idsAnexos.forEach(id => pendRotaRemoverLinha_(ss,'ANEXOS_ITENS_ROTA','ID_ANEXO_ITEM',id));
        idsItens.forEach(id => pendRotaRemoverLinha_(ss,'ITENS_OCORRENCIA','ID_ITEM',id));
        pendRotaRemoverLinha_(ss,'HISTORICO','ID_HISTORICO',idHistorico);
        const temp = DriveApp.getFolderById(cfg.PASTA_TEMP_ID);
        arquivos.forEach(a => { [a.material,a.pedido].forEach(f => { try { f.moveTo(temp); } catch(_) {} }); });
        try { pasta.setTrashed(true); } catch (_) {}
      }
      throw erro;
    }
    try {
      registrarEvento_(c.p.rotas[0].ROTA_ID, c.p.id, c.sessao.veiculo, c.motorista.NOME,
        'PENDENCIA_SAC','PENDENCIA_REGISTRADA',protocolo+' — '+pedido,c.sessao.usuario,'MOTORISTA');
    } catch (_) {} // O registro no SAC não deve falhar se o histórico da Rota estiver indisponível.
    return {sucesso:true,protocolo,mensagem:'Pendência registrada na base do SAC.'};
  } finally { lock.releaseLock(); }
}

/** Rodar uma vez no editor antes de publicar: valida acesso e estrutura sem gravar dados. */
function diagnosticoIntegracaoPendencias() {
  const ss = pendRotaPlanilha_();
  Object.keys(PEND_ROTA.ABAS).forEach(n => pendRotaAba_(ss,n,PEND_ROTA.ABAS[n]));
  ['MOTORISTAS','VEICULOS','MOTIVOS','CONFIG'].forEach(n => { if (!ss.getSheetByName(n)) throw new Error('Aba ausente: '+n); });
  const cfg = pendRotaCfg_(ss);
  DriveApp.getFolderById(cfg.PASTA_RAIZ_ID).getName();
  DriveApp.getFolderById(cfg.PASTA_TEMP_ID).getName();
  return {sucesso:true,mensagem:'Leitura da base, estrutura e pastas de Pendências validadas. Nenhuma informação alterada.'};
}


/** Compara todos os veículos ativos da rota com o cadastro do SAC, sem editar planilhas. */
function diagnosticoVeiculosIntegracaoPendencias() {
  const ss = pendRotaPlanilha_();
  const carros = pendRotaCadastro_(ss,'VEICULOS',['ID_VEICULO','IDENTIFICACAO','PLACA','ATIVO']);
  const rotas = consolidarVeiculos_(lerObjetos_(APP.ABAS.VEICULOS));
  const resultados = rotas.map(v => {
    const descricao = String(v.VEICULO || '');
    try {
      const sac = pendRotaVincularVeiculo_(carros, descricao, v.PLACA);
      return {rota:descricao, sac:String(sac.IDENTIFICACAO), idSac:String(sac.ID_VEICULO), ok:true};
    } catch (e) {
      return {rota:descricao, ok:false, motivo:String(e.message || e)};
    }
  });
  return {sucesso:resultados.every(v => v.ok), total:resultados.length,
    encontrados:resultados.filter(v => v.ok).length, pendentes:resultados.filter(v => !v.ok),
    vinculados:resultados.filter(v => v.ok)};
}
