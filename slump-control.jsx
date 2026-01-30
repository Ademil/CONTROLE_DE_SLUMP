import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, FileText, Calculator, Beaker } from 'lucide-react';

export default function SlumpControlApp() {
  const [formData, setFormData] = useState({
    slumpMedido: '',
    slumpProjeto: '',
    volume: '',
    consumoCimento: '',
    relacaoACProjeto: '',
    aguaPrevista: '',
    tipoCimento: 'CP II',
    tipoAgregado: 'Brita 1',
    aditivo: 'nenhum',
    temperatura: '',
    idadeConcreto: '',
    elementoEstrutural: 'laje'
  });

  const [resultado, setResultado] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calcularAjuste = () => {
    const slumpMedido = parseFloat(formData.slumpMedido);
    const slumpProjeto = parseFloat(formData.slumpProjeto);
    const volume = parseFloat(formData.volume);
    const consumoCimento = parseFloat(formData.consumoCimento);
    const relacaoACProjeto = parseFloat(formData.relacaoACProjeto);
    const aguaPrevista = parseFloat(formData.aguaPrevista);
    const temperatura = parseFloat(formData.temperatura);
    const idadeConcreto = parseFloat(formData.idadeConcreto);

    // Diferença de slump
    const diferencaSlump = slumpMedido - slumpProjeto;

    // Se o slump está adequado
    if (Math.abs(diferencaSlump) <= 10) {
      setResultado({
        classificacao: 'adequado',
        mensagem: 'Slump dentro da tolerância aceitável (±10mm)',
        slumpCorrigido: slumpMedido,
        aguaAdicional: 0,
        aditivoRecomendado: 0,
        novaRelacaoAC: relacaoACProjeto,
        riscos: [],
        permitido: true
      });
      return;
    }

    // Se o slump está alto (muito fluido)
    if (diferencaSlump > 10) {
      setResultado({
        classificacao: 'nao-conforme-alto',
        mensagem: `Slump ${diferencaSlump}mm acima do especificado. Concreto excessivamente fluido. REJEITAR CARGA.`,
        slumpCorrigido: slumpMedido,
        aguaAdicional: 0,
        aditivoRecomendado: 0,
        novaRelacaoAC: relacaoACProjeto,
        riscos: [
          'Possível excesso de água',
          'Comprometimento da resistência',
          'Aumento da retração',
          'Segregação do concreto',
          'Exsudação excessiva'
        ],
        permitido: false,
        alertaNormativo: 'NBR 12655: Concreto com características fora da especificação deve ser rejeitado.'
      });
      return;
    }

    // Slump baixo - necessita correção
    const slumpNecessario = Math.abs(diferencaSlump);
    
    // Fator de correção base: 2.5 L/m³ para cada 10mm
    let fatorCorrecao = 2.5;
    
    // Ajustes por temperatura
    if (temperatura > 30) fatorCorrecao += 0.3;
    if (temperatura > 35) fatorCorrecao += 0.5;
    
    // Ajustes por tempo
    if (idadeConcreto > 90) fatorCorrecao += 0.5;
    if (idadeConcreto > 120) fatorCorrecao += 0.8;
    
    // Ajustes por tipo de agregado
    if (formData.tipoAgregado === 'Brita 0') fatorCorrecao += 0.3;
    if (formData.tipoAgregado === 'Seixo') fatorCorrecao -= 0.2;

    // Cálculo de água adicional
    const aguaAdicionalPorM3 = (slumpNecessario / 10) * fatorCorrecao;
    const aguaTotalAdicional = aguaAdicionalPorM3 * volume;

    // Nova relação a/c
    const aguaTotalNova = aguaPrevista * volume + aguaTotalAdicional;
    const cimentoTotal = consumoCimento * volume;
    const novaRelacaoAC = aguaTotalNova / cimentoTotal;

    // Limite de segurança (5% abaixo do limite de projeto)
    const limiteSeguranca = relacaoACProjeto * 1.05;

    // Avaliar se pode adicionar água
    let classificacao = '';
    let mensagem = '';
    let permitido = false;
    let aguaPermitida = 0;
    let aditivoRecomendado = 0;
    let riscos = [];
    let alertaNormativo = '';

    if (novaRelacaoAC <= relacaoACProjeto) {
      // Correção permitida
      classificacao = 'permitida';
      mensagem = 'Correção com água permitida dentro dos limites normativos.';
      permitido = true;
      aguaPermitida = aguaTotalAdicional;
      riscos = ['Monitorar homogeneidade após adição'];
    } else if (novaRelacaoAC <= limiteSeguranca) {
      // Permitida com ressalvas
      classificacao = 'permitida-ressalvas';
      mensagem = 'Correção próxima ao limite. Adicionar água com extrema cautela e registrar ajuste.';
      permitido = true;
      aguaPermitida = aguaTotalAdicional;
      riscos = [
        'Próximo ao limite de a/c',
        'Pode afetar resistência marginalmente',
        'Exige controle rigoroso de adição',
        'Aumentar amostragem de CPs'
      ];
      alertaNormativo = 'NBR 12655: A relação a/c está no limite. Aumentar o controle tecnológico.';
    } else {
      // Não permitida - recomendar aditivo
      classificacao = 'nao-permitida';
      mensagem = 'Adição de água PROIBIDA - ultrapassaria a relação a/c de projeto.';
      permitido = false;
      aguaPermitida = 0;
      
      // Calcular aditivo necessário
      // Plastificante: 10-20mm de ganho com 0.2-0.5% sobre cimento
      // Superplastificante: 30-80mm de ganho com 0.5-2.0% sobre cimento
      
      if (formData.aditivo === 'nenhum') {
        if (slumpNecessario <= 30) {
          aditivoRecomendado = (consumoCimento * volume * 0.004); // 0.4% em litros
          mensagem += ' SOLUÇÃO: Adicionar plastificante.';
        } else {
          aditivoRecomendado = (consumoCimento * volume * 0.012); // 1.2% em litros
          mensagem += ' SOLUÇÃO: Adicionar superplastificante.';
        }
      } else if (formData.aditivo === 'plastificante') {
        aditivoRecomendado = (consumoCimento * volume * 0.003); // dose adicional
        mensagem += ' SOLUÇÃO: Adicionar dose complementar de plastificante.';
      } else {
        aditivoRecomendado = (consumoCimento * volume * 0.005); // dose adicional
        mensagem += ' SOLUÇÃO: Adicionar dose complementar de superplastificante.';
      }

      riscos = [
        'Violação da relação a/c de projeto',
        'Perda significativa de resistência',
        'Comprometimento da durabilidade',
        'Aumento de permeabilidade',
        'Risco de fissuração por retração'
      ];
      alertaNormativo = 'NBR 12655 Art. 6.2.2: Concretos que não atendem aos requisitos de dosagem devem ser rejeitados ou corrigidos com aditivos, nunca com água adicional que ultrapasse a relação a/c especificada.';
    }

    // Slump corrigido estimado
    let slumpCorrigido = slumpProjeto;
    if (permitido && aguaPermitida > 0) {
      slumpCorrigido = slumpMedido + slumpNecessario;
    } else if (aditivoRecomendado > 0) {
      slumpCorrigido = slumpProjeto;
    }

    setResultado({
      classificacao,
      mensagem,
      slumpCorrigido,
      aguaAdicional: aguaPermitida,
      aguaPorM3: aguaPermitida / volume,
      aditivoRecomendado,
      aditivoPercentual: (aditivoRecomendado / cimentoTotal * 100).toFixed(2),
      novaRelacaoAC: novaRelacaoAC.toFixed(3),
      limiteAC: relacaoACProjeto.toFixed(3),
      riscos,
      permitido,
      alertaNormativo,
      diferencaSlump: Math.abs(diferencaSlump),
      // Dados para registro
      registro: {
        data: new Date().toLocaleString('pt-BR'),
        slumpMedido,
        slumpProjeto,
        volume,
        temperatura,
        idadeConcreto,
        responsavel: 'Técnico de Controle Tecnológico'
      }
    });
  };

  const getClassificacaoIcon = (classificacao) => {
    if (!classificacao) return null;
    if (classificacao === 'adequado' || classificacao === 'permitida') {
      return <CheckCircle className="w-8 h-8 text-emerald-500" />;
    }
    if (classificacao === 'permitida-ressalvas') {
      return <AlertTriangle className="w-8 h-8 text-amber-500" />;
    }
    return <XCircle className="w-8 h-8 text-red-500" />;
  };

  const getClassificacaoColor = (classificacao) => {
    if (!classificacao) return '';
    if (classificacao === 'adequado' || classificacao === 'permitida') return 'border-emerald-500 bg-emerald-50';
    if (classificacao === 'permitida-ressalvas') return 'border-amber-500 bg-amber-50';
    if (classificacao === 'nao-conforme-alto') return 'border-red-600 bg-red-50';
    return 'border-red-500 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8 font-sans">
      {/* Header com design técnico */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 p-8 rounded-2xl shadow-2xl border-4 border-orange-400">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-white p-3 rounded-xl">
              <Beaker className="w-10 h-10 text-orange-600" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight" style={{ fontFamily: 'Impact, sans-serif' }}>
                CONTROLE DE SLUMP
              </h1>
              <p className="text-orange-100 text-lg font-semibold mt-1">
                Sistema de Ajuste de Trabalhabilidade do Concreto Fresco
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-bold">
              ABNT NBR 12655
            </span>
            <span className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-bold">
              NBR NM 67
            </span>
            <span className="bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold">
              Controle Tecnológico
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
        {/* Formulário */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-slate-200">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-4 border-orange-500">
            <Calculator className="w-7 h-7 text-orange-600" />
            <h2 className="text-2xl font-black text-slate-800" style={{ fontFamily: 'Arial Black, sans-serif' }}>
              DADOS DA CARGA
            </h2>
          </div>

          <div className="space-y-6">
            {/* Seção Slump */}
            <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 text-lg">SLUMP (mm)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Medido *</label>
                  <input
                    type="number"
                    name="slumpMedido"
                    value={formData.slumpMedido}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold text-lg"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Projeto *</label>
                  <input
                    type="number"
                    name="slumpProjeto"
                    value={formData.slumpProjeto}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold text-lg"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Seção Traço */}
            <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 text-lg">CARACTERÍSTICAS DO TRAÇO</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Volume (m³) *</label>
                    <input
                      type="number"
                      step="0.1"
                      name="volume"
                      value={formData.volume}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                      placeholder="0.0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Cimento (kg/m³) *</label>
                    <input
                      type="number"
                      name="consumoCimento"
                      value={formData.consumoCimento}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Relação a/c *</label>
                    <input
                      type="number"
                      step="0.01"
                      name="relacaoACProjeto"
                      value={formData.relacaoACProjeto}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Água (L/m³) *</label>
                    <input
                      type="number"
                      name="aguaPrevista"
                      value={formData.aguaPrevista}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Materiais */}
            <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 text-lg">MATERIAIS</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Tipo de Cimento</label>
                    <select
                      name="tipoCimento"
                      value={formData.tipoCimento}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                    >
                      <option value="CP I">CP I</option>
                      <option value="CP II">CP II</option>
                      <option value="CP III">CP III</option>
                      <option value="CP IV">CP IV</option>
                      <option value="CP V-ARI">CP V-ARI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Agregado</label>
                    <select
                      name="tipoAgregado"
                      value={formData.tipoAgregado}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                    >
                      <option value="Brita 0">Brita 0</option>
                      <option value="Brita 1">Brita 1</option>
                      <option value="Brita 2">Brita 2</option>
                      <option value="Seixo">Seixo</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Aditivo em Uso</label>
                  <select
                    name="aditivo"
                    value={formData.aditivo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                  >
                    <option value="nenhum">Nenhum</option>
                    <option value="plastificante">Plastificante</option>
                    <option value="superplastificante">Superplastificante</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Seção Condições */}
            <div className="bg-slate-50 p-5 rounded-xl border-2 border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 text-lg">CONDIÇÕES DE OBRA</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Temperatura (°C) *</label>
                    <input
                      type="number"
                      name="temperatura"
                      value={formData.temperatura}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Idade (minutos) *</label>
                    <input
                      type="number"
                      name="idadeConcreto"
                      value={formData.idadeConcreto}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Elemento Estrutural</label>
                  <select
                    name="elementoEstrutural"
                    value={formData.elementoEstrutural}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-orange-500 focus:outline-none font-semibold"
                  >
                    <option value="laje">Laje</option>
                    <option value="viga">Viga</option>
                    <option value="pilar">Pilar</option>
                    <option value="bloco">Bloco de Fundação</option>
                    <option value="fundacao">Fundação</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={calcularAjuste}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-5 rounded-xl font-black text-xl hover:from-orange-700 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              style={{ fontFamily: 'Impact, sans-serif' }}
            >
              CALCULAR AJUSTE
            </button>
          </div>
        </div>

        {/* Resultados */}
        <div className="space-y-6">
          {resultado && (
            <>
              {/* Card de Status */}
              <div className={`${getClassificacaoColor(resultado.classificacao)} border-4 rounded-2xl p-8 shadow-2xl`}>
                <div className="flex items-start gap-4 mb-6">
                  {getClassificacaoIcon(resultado.classificacao)}
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-slate-800 mb-2" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                      {resultado.classificacao === 'adequado' && 'SLUMP ADEQUADO'}
                      {resultado.classificacao === 'permitida' && 'CORREÇÃO PERMITIDA'}
                      {resultado.classificacao === 'permitida-ressalvas' && 'CORREÇÃO COM RESSALVAS'}
                      {resultado.classificacao === 'nao-permitida' && 'CORREÇÃO NÃO PERMITIDA'}
                      {resultado.classificacao === 'nao-conforme-alto' && 'NÃO CONFORMIDADE'}
                    </h2>
                    <p className="text-slate-700 font-semibold text-lg leading-relaxed">
                      {resultado.mensagem}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabela Técnica */}
              <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-slate-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-4 border-orange-500">
                  <FileText className="w-7 h-7 text-orange-600" />
                  <h2 className="text-2xl font-black text-slate-800" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                    DADOS TÉCNICOS
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                    <div>
                      <p className="text-sm font-bold text-slate-500">SLUMP MEDIDO</p>
                      <p className="text-3xl font-black text-slate-800">{formData.slumpMedido} mm</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500">SLUMP PROJETO</p>
                      <p className="text-3xl font-black text-slate-800">{formData.slumpProjeto} mm</p>
                    </div>
                  </div>

                  {resultado.diferencaSlump !== undefined && (
                    <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                      <p className="text-sm font-bold text-orange-700">DIFERENÇA</p>
                      <p className="text-3xl font-black text-orange-600">
                        {resultado.diferencaSlump > 0 ? '+' : ''}{(parseFloat(formData.slumpMedido) - parseFloat(formData.slumpProjeto)).toFixed(0)} mm
                      </p>
                    </div>
                  )}

                  {resultado.aguaAdicional > 0 && (
                    <>
                      <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                        <p className="text-sm font-bold text-blue-700">ÁGUA ADICIONAL MÁXIMA</p>
                        <p className="text-3xl font-black text-blue-600">{resultado.aguaAdicional.toFixed(1)} L</p>
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          {resultado.aguaPorM3.toFixed(1)} L/m³
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                          <p className="text-sm font-bold text-slate-600">a/c ORIGINAL</p>
                          <p className="text-2xl font-black text-slate-800">{resultado.limiteAC}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border-2 border-slate-200">
                          <p className="text-sm font-bold text-slate-600">NOVA a/c</p>
                          <p className="text-2xl font-black text-slate-800">{resultado.novaRelacaoAC}</p>
                        </div>
                      </div>
                    </>
                  )}

                  {resultado.aditivoRecomendado > 0 && (
                    <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                      <p className="text-sm font-bold text-purple-700">ADITIVO RECOMENDADO</p>
                      <p className="text-3xl font-black text-purple-600">
                        {resultado.aditivoRecomendado.toFixed(2)} L
                      </p>
                      <p className="text-sm font-semibold text-purple-600 mt-1">
                        {resultado.aditivoPercentual}% sobre massa de cimento
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Riscos */}
              {resultado.riscos && resultado.riscos.length > 0 && (
                <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-amber-300">
                  <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="w-7 h-7 text-amber-600" />
                    <h3 className="text-xl font-black text-slate-800" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                      RISCOS TÉCNICOS
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {resultado.riscos.map((risco, index) => (
                      <li key={index} className="flex items-start gap-3 text-slate-700 font-semibold">
                        <span className="text-amber-600 font-black text-lg">▸</span>
                        <span>{risco}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alerta Normativo */}
              {resultado.alertaNormativo && (
                <div className="bg-red-600 border-4 border-red-700 rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-8 h-8 text-white flex-shrink-0" />
                    <div>
                      <h3 className="text-xl font-black text-white mb-3" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                        ALERTA NORMATIVO
                      </h3>
                      <p className="text-white font-semibold text-lg leading-relaxed">
                        {resultado.alertaNormativo}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo Executivo */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 border-4 border-slate-700">
                <h3 className="text-2xl font-black text-white mb-6" style={{ fontFamily: 'Arial Black, sans-serif' }}>
                  RESUMO EXECUTIVO PARA OBRA
                </h3>
                <div className="bg-white/10 backdrop-blur rounded-xl p-6 border-2 border-white/20">
                  <div className="space-y-4 text-white font-semibold">
                    <p>
                      <span className="text-orange-400 font-black">DATA/HORA:</span> {resultado.registro.data}
                    </p>
                    <p>
                      <span className="text-orange-400 font-black">VOLUME:</span> {formData.volume} m³
                    </p>
                    <p>
                      <span className="text-orange-400 font-black">ELEMENTO:</span> {formData.elementoEstrutural.toUpperCase()}
                    </p>
                    <p>
                      <span className="text-orange-400 font-black">SLUMP:</span> Medido {formData.slumpMedido}mm / Projeto {formData.slumpProjeto}mm
                    </p>
                    {resultado.permitido ? (
                      <>
                        {resultado.aguaAdicional > 0 && (
                          <p className="text-emerald-300 font-black text-lg pt-2 border-t-2 border-white/20">
                            ✓ ADICIONAR {resultado.aguaAdicional.toFixed(1)} LITROS DE ÁGUA
                          </p>
                        )}
                        {resultado.aditivoRecomendado > 0 && (
                          <p className="text-purple-300 font-black text-lg pt-2 border-t-2 border-white/20">
                            ✓ ADICIONAR {resultado.aditivoRecomendado.toFixed(2)} LITROS DE ADITIVO
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-red-300 font-black text-lg pt-2 border-t-2 border-white/20">
                        ✗ {resultado.aditivoRecomendado > 0 ? 
                          `USAR ADITIVO: ${resultado.aditivoRecomendado.toFixed(2)} L` : 
                          'REJEITAR CARGA'}
                      </p>
                    )}
                    <p className="text-sm text-slate-300 pt-4 border-t-2 border-white/20">
                      Registro efetuado pelo sistema de controle tecnológico conforme NBR 12655
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {!resultado && (
            <div className="bg-white rounded-2xl shadow-2xl p-12 border-4 border-slate-200 text-center">
              <Beaker className="w-20 h-20 text-slate-300 mx-auto mb-6" />
              <p className="text-slate-400 font-bold text-lg">
                Preencha os dados da carga e clique em CALCULAR AJUSTE
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-12 text-center">
        <div className="bg-slate-800 rounded-xl p-6 border-2 border-slate-700">
          <p className="text-slate-300 font-semibold text-sm">
            Sistema desenvolvido em conformidade com ABNT NBR 12655:2015 (Concreto de cimento Portland - Preparo, controle, recebimento e aceitação) e NBR NM 67:1998 (Concreto - Determinação da consistência pelo abatimento do tronco de cone)
          </p>
          <p className="text-slate-400 font-medium text-xs mt-3">
            © 2026 - Controle Tecnológico do Concreto - Todos os cálculos devem ser validados por engenheiro responsável
          </p>
        </div>
      </div>
    </div>
  );
}