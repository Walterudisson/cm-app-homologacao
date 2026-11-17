// Usa a mesma identidade Firebase do CMAPP; nunca armazena a senha.
export function conectarLoginPiloto({auth,entrar,document}){
 const form=document.getElementById('pilot-login'),erro=document.getElementById('pilot-login-error'),botao=document.getElementById('pilot-login-submit');let geracao=0,ocupado=false;
 function ocultar(){++geracao;ocupado=false;form.reset();form.classList.add('hidden');erro.textContent='';botao.disabled=false;}
 function mostrar(){form.classList.remove('hidden');}
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(ocupado)return;const email=form.elements.email.value.trim(),senha=form.elements.senha.value;
  if(!email||!senha)return;ocupado=true;const token=++geracao;botao.disabled=true;erro.textContent='';
  try{await entrar(auth,email,senha);}catch(e){if(token===geracao)erro.textContent=e.code==='auth/network-request-failed'?'Não foi possível conectar. Verifique sua conexão e tente novamente.':'Não foi possível entrar. Confira suas credenciais e tente novamente.';}
  finally{if(token===geracao){form.elements.senha.value='';ocupado=false;botao.disabled=false;}}
 });
 return{mostrar,ocultar};
}
