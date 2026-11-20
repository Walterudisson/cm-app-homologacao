# GAB-01 | Fundação cadastral — candidato de contrato, sem implantação
## Inventário do atual
- app.js lê usuarios/{uid}, inclusive listagem de conferentes para gestor. Perfil, modulos, divisoesAtribuidas (inclusive variante histórica divisaoAtribuidas) e permissoes influenciam acesso. Login rejeita conta versionada. Não adicionar dados privados nesse documento nem mudar a semântica existente.
- usuarios.service.js chama criarUsuario, atualizarUsuario e alterarEstadoUsuario. As implementações de Functions e Firestore Rules não estão disponíveis nos caminhos functions/index.js e firestore.rules do repositório HML. Não é possível confirmar segurança real com o frontend.
- divisoes.service.js usa documentos divisoes com chave derivada do nome, responsáveis por UID, atualização direta. Inventários e escopos usam nomes. Não renomear IDs ou valores existentes.
- DSIPS obtém responsáveis via dsipsListarResponsaveis e usa responsavelId; não substituir UID/ID por pessoaId nesta fase.
- modules.js concede módulos operacionais ao admin e bloqueia perfil usuario fora de perfil. Necessita mudança específica futura: Gabinete expressamente concedido, inclusive admin; manter regras atuais dos outros módulos.
## Coleções propostas (nomes a confirmar antes de criar)
| Coleção | Conteúdo e autoridade |
|---|---|
| pessoasInstitucionais/{pessoaId} | Identidade, nome completo, nome de guerra, posto/cargo, quadro, tipo, situação e unidadeId. Administração autorizada; ID aleatório estável, sem CPF. |
| pessoasPrivado/{pessoaId} | CPF se necessário e aprovado, nascimento completo e demais dados administrativos restritos. Acesso administrativo específico. |
| pessoasContatos/{pessoaId} | Telefones institucionais/particulares, e-mail institucional e revisão. Acesso por servidor, titular pode alterar somente seu telefone; não retornar documento bruto ao Gabinete. |
| vinculosContas/{uid} | pessoaId; vínculo unique em ambas direções, reservado à administração; índice reverso transacional para impedir duplicidade. |
| unidadesOrganizacionais/{unidadeId} | nome, sigla, tipo, unidadePaiId, ativo, referência à divisão existente, responsáveis por pessoaId. Sem ciclo; preservar IDs, nomes e escopos legados. |
| agendaConcessoes/{uid} | concessões explícitas de consulta, gestão, telefone particular, situação e auditoria; sem usar admin ou lotação como concessão automática. |
| agendaRamais/{id} | unidade/serviço, ramal como string, vínculos opcionais com pessoas; múltiplos ramais, compartilhamento e sem pessoa. |
| agendaExternos/{id} | contatos externos, categoria e campos permitidos, sem criar conta. |
| agendaPreferencias/{uid} | favoritos e lembretes configuráveis, titular somente. |
| agendaAuditoria/{id} | ações administrativas e metadados mínimos; evitar valores privados em logs. |
## Política e contrato
Servidor valida autenticação real, conta ativa, identidade ativa, concessão explícita e revogação atual em cada consulta/exportação. Privado requer adicionalmente autorização específica e papel Gabinete/admin autorizado; administrativo não implica acesso automático. Titular tem endpoint separado para próprio telefone/foto, não consulta coletiva. CPF e nascimento completo não saem na Agenda. Aniversário somente dia/mês. A busca e os exports operam exclusivamente sobre a mesma projeção autorizada; jamais pesquisar coleção privada e filtrar depois. Dados privados em coleções separadas; Rules fechadas por padrão para novas coleções, escrita restrita a funções autorizadas; não implantar regras substitutivas genéricas. Foto exige estratégia Storage autorizada sem URL pública permanente. O contrato executável em design/gabinete/contrato.mjs é referência pura, sem SDK e sem uso pelo app; não constitui segurança real.
## Compatibilidade HML
Mapear GCM/GAB, SCCM e DCRI com autoridade institucional; não inferir hierarquia ausente. Preservar usuários e escopos, não criar Firebase Auth a partir de importação, não apagar contas, não converter perfil, não modificar cautelas. Não permitir que lotação institucional conceda privilégios. Desligamento exige fluxo administrativo explícito de revogação; nenhuma ausência na planilha deve causar desativação automática.
## Próximo gate: backend
Obter cópia atual das Rules em HML e código fonte das Functions do diretório efetivamente implantado, sem credenciais, dados, tokens ou .env. Revisar permissões, dependências, índices, formato de usuários/DSIPS; decidir endpoints, regras e migração, validar com Emulator Suite e testes reais HML. Autorização específica antes de publicar. Excel original necessário para GAB-02; validação de cabeçalhos, simulação de importação, conflitos antes de gravações. Confirmar homologação SAN-01 e protótipo GAB-00.
Nenhum dado real, deploy, alteração de versão operacional ou PRD nesta entrega.
