// --- CONFIGURAÇÃO NUVEM SUPABASE ---
const SUPABASE_URL = "https://amdiaevxeajvqktdrbnz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtZGlhZXZ4ZWFqdnFrdGRyYm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MTEzMjMsImV4cCI6MjEwODk4NzMyM30.8Dt7jMKYa49BU7b8LgArnRvKzOhPZCpBMqpz3uVfhL8";

// Função de segurança infalível para obter o cliente Supabase sem erros de inicialização
function getSupabase() {
  if (window._supabaseClient) return window._supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window._supabaseClient;
  }
  return null;
}

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
  
  const db = getSupabase();
  if (!db) {
    setTimeout(carregarBarbeirosIndex, 500); // Tenta novamente se o CDN demorar
    return;
  }

  try {
    const { data, error } = await db.from("profissionais").select("*").order("id", { ascending: true });
    if (error) {
      selectBarbeiro.innerHTML = '<option value="">Erro ao carregar barbeiros</option>';
      return;
    }

    if (!data || data.length === 0) {
      selectBarbeiro.innerHTML = '<option value="">Nenhum barbeiro cadastrado</option>';
      return;
    }

    selectBarbeiro.innerHTML = '<option value="">Selecione um barbeiro</option>';
    data.forEach(b => {
      selectBarbeiro.innerHTML += `<option value="${b.id}">${b.nome}</option>`;
    });
  } catch (e) {
    console.error(e);
  }
}

async function cadastrarCliente(event) {
  event.preventDefault();
  const db = getSupabase();
  if (!db) {
    alert("Erro de conexão com a base de dados. Aguarde um momento e tente novamente.");
    return;
  }

  const nome = document.getElementById("cadastro-nome").value.trim();
  const telefone = document.getElementById("cadastro-telefone").value.trim();
  const email = document.getElementById("cadastro-email").value.trim();
  const senha = document.getElementById("cadastro-senha").value.trim();

  try {
    const { data, error } = await db.from("clientes").insert([{
      nome, telefone, email: email || null, senha, ativo: "sim"
    }]).select();

    if (error) throw error;

    alert("Conta criada com sucesso!");
    clienteLogado = { id: data[0].id, nome: data[0].nome };
    localStorage.setItem("cliente_barba_studio", JSON.stringify(clienteLogado));
    abrirAgendamentoCliente();
  } catch (err) {
    alert("Erro ao cadastrar: " + (err.message || "Telemóvel já registado ou falha na nuvem."));
  }
}

async function fazerLogin(event) {
  event.preventDefault();
  const db = getSupabase();
  if (!db) {
    alert("Erro de conexão com a base de dados.");
    return;
  }

  const telefone = document.getElementById("login-telefone").value.trim();
  const senha = document.getElementById("login-senha").value.trim();

  try {
    const { data, error } = await db.from("clientes").select("*").eq("telefone", telefone).eq("senha", senha).maybeSingle();

    if (error || !data) {
      alert("Telemóvel ou senha incorretos.");
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
  const db = getSupabase();
  if (!db) return;
  const telefone = document.getElementById("esqueci-telefone").value.trim();

  try {
    const { data, error } = await db.from("clientes").select("*").eq("telefone", telefone).maybeSingle();

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
  const db = getSupabase();
  if (!clienteLogado || !db) return mostrarTela("card-login");

  const profissionalId = document.getElementById("barbeiro-select").value;
  const dataAgendamento = document.getElementById("data-agendamento").value;
  const horaAgendamento = document.getElementById("hora-agendamento").value;

  if (!profissionalId || !dataAgendamento || !horaAgendamento) {
    alert("Por favor, preencha todos os campos.");
    return;
  }

  try {
    const { error } = await db.from("agendamentos").insert([{
      cliente_nome: clienteLogado.nome,
      cliente_id: clienteLogado.id,
      profissional_id: parseInt(profissionalId),
      data_agendamento: dataAgendamento,
      hora_agendamento: horaAgendamento,
      status: "ativo"
    }]);

    if (error) throw error;
    alert("Agendamento efetuado com sucesso!");
    sairCliente();
  } catch (err) {
    alert("Erro ao agendar: " + err.message);
  }
}