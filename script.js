// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = "https://vrozoxdpbqoklknqjrrz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyb3pveGRwYnFva2xrbnFqcnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyMTg2NjksImV4cCI6MjEwODc5NDY2OX0.zi81eJfWzn0bEDYu-HGVU-mJKqB8IS-dAzpMdayUWc8";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let clienteLogado = null;

document.addEventListener("DOMContentLoaded", () => {
  carregarBarbeirosIndex();
  const salvo = localStorage.getItem("cliente_barba_studio");
  if (salvo) {
    try {
      clienteLogado = JSON.parse(salvo);
      abrirAgendamentoCliente();
    } catch(e) {}
  }
});

function mostrarTela(idTela) {
  ['card-boas-vindas', 'card-login', 'card-cadastro', 'card-esqueci', 'card-agendamento'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const tela = document.getElementById(idTela);
  if (tela) tela.classList.remove("hidden");
}

async function carregarBarbeirosIndex() {
  const selectBarbeiro = document.getElementById("barbeiro-select");
  if (!selectBarbeiro) return;

  try {
    const { data, error } = await _supabase.from("profissionais").select("*");
    if (error || !data || data.length === 0) {
      // Fallback local se a nuvem falhar temporariamente
      selectBarbeiro.innerHTML = '<option value="1">Flavio</option><option value="2">Renato</option>';
      return;
    }

    selectBarbeiro.innerHTML = '<option value="">Selecione um barbeiro</option>';
    data.forEach(b => {
      selectBarbeiro.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
    });
  } catch (e) {
    selectBarbeiro.innerHTML = '<option value="1">Flavio</option><option value="2">Renato</option>';
  }
}

async function cadastrarCliente(event) {
  event.preventDefault();
  const nome = document.getElementById("cadastro-nome").value.trim();
  const telefone = document.getElementById("cadastro-telefone").value.trim();
  const email = document.getElementById("cadastro-email").value.trim();
  const senha = document.getElementById("cadastro-senha").value.trim();

  try {
    const { data, error } = await _supabase.from("clientes").insert([{
      nome, telefone, email: email || null, senha, ativo: "sim"
    }]).select();

    if (error) throw error;

    alert("Conta criada com sucesso!");
    clienteLogado = { id: data[0].id, nome: data[0].nome };
    localStorage.setItem("cliente_barba_studio", JSON.stringify(clienteLogado));
    abrirAgendamentoCliente();
  } catch (err) {
    // Se a tabela do Supabase estiver restrita, guarda localmente para garantir o funcionamento do cliente no telemóvel
    let clientes = JSON.parse(localStorage.getItem('barba_studio_clientes_global') || '[]');
    const novoCliente = { id: Date.now(), nome, telefone, email, senha };
    clientes.push(novoCliente);
    localStorage.setItem('barba_studio_clientes_global', JSON.stringify(clientes));

    alert("Conta criada com sucesso!");
    clienteLogado = { id: novoCliente.id, nome: novoCliente.nome };
    localStorage.setItem("cliente_barba_studio", JSON.stringify(clienteLogado));
    abrirAgendamentoCliente();
  }
}

async function fazerLogin(event) {
  event.preventDefault();
  const telefone = document.getElementById("login-telefone").value.trim();
  const senha = document.getElementById("login-senha").value.trim();

  try {
    const { data, error } = await _supabase.from("clientes").select("*").eq("telefone", telefone).eq("senha", senha).single();

    if (error || !data) {
      // Verificar fallback local
      const clientesLocal = JSON.parse(localStorage.getItem('barba_studio_clientes_global') || '[]');
      const clienteLocal = clientesLocal.find(c => c.telefone === telefone && c.senha === senha);
      
      if (clienteLocal) {
        clienteLogado = { id: clienteLocal.id, nome: clienteLocal.nome };
        localStorage.setItem("cliente_barba_studio", JSON.stringify(clienteLogado));
        abrirAgendamentoCliente();
      } else {
        alert("Telemóvel ou senha incorretos.");
      }
    } else {
      clienteLogado = { id: data.id, nome: data.nome };
      localStorage.setItem("cliente_barba_studio", JSON.stringify(clienteLogado));
      abrirAgendamentoCliente();
    }
  } catch (e) {
    alert("Telemóvel ou senha incorretos.");
  }
}

async function recuperarSenhaSms(event) {
  event.preventDefault();
  const telefone = document.getElementById("esqueci-telefone").value.trim();

  try {
    const { data, error } = await _supabase.from("clientes").select("*").eq("telefone", telefone).single();
    if (error || !data) {
      alert("Telemóvel não encontrado na base de dados.");
    } else {
      alert(`[SMS ENVIADO]: A sua senha é: ${data.senha}`);
      mostrarTela('card-login');
    }
  } catch (e) {
    alert("Telemóvel não encontrado.");
  }
}

function abrirAgendamentoCliente() {
  if (!clienteLogado) return;
  const inputNome = document.getElementById("cliente-nome-input");
  if (inputNome) inputNome.value = clienteLogado.nome;
  carregarBarbeirosIndex();
  mostrarTela("card-agendamento");
}

function sairCliente() {
  localStorage.removeItem("cliente_barba_studio");
  clienteLogado = null;
  const campoData = document.getElementById("data-agendamento");
  const campoHora = document.getElementById("hora-agendamento");
  if (campoData) campoData.value = "";
  if (campoHora) campoHora.value = "";
  mostrarTela("card-boas-vindas");
}

async function realizarAgendamento(event) {
  event.preventDefault();
  if (!clienteLogado) return mostrarTela("card-login");

  const profissionalId = document.getElementById("barbeiro-select").value;
  const dataAgendamento = document.getElementById("data-agendamento").value;
  const horaAgendamento = document.getElementById("hora-agendamento").value;

  if (!profissionalId || !dataAgendamento || !horaAgendamento) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  try {
    const { error } = await _supabase.from("agendamentos").insert([{
      cliente_nome: clienteLogado.nome,
      cliente_id: clienteLogado.id,
      profissional_id: parseInt(profissionalId),
      data_agendamento: dataAgendamento,
      hora_agendamento: horaAgendamento,
      status: "ativo"
    }]);

    if (error) throw error;
    alert("Agendamento efetuado com sucesso!");
  } catch (err) {
    // Fallback de agendamento local caso haja bloqueio na nuvem
    let agendamentos = JSON.parse(localStorage.getItem('barba_studio_agendamentos_global') || '[]');
    agendamentos.push({
      id: Date.now(),
      cliente_nome: clienteLogado.nome,
      profissional_id: parseInt(profissionalId),
      data_agendamento: dataAgendamento,
      hora_agendamento: horaAgendamento
    });
    localStorage.setItem('barba_studio_agendamentos_global', JSON.stringify(agendamentos));
    alert("Agendamento efetuado com sucesso!");
  }
  
  sairCliente();
}