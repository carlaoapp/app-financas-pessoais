# Protocolo de Trabalho e Atualizações Automáticas - APP Finanças Pessoais

Este protocolo define como o assistente deve proceder em TODAS as solicitações futuras de melhorias e alterações feitas pelo usuário:

## Regras Obrigatórias para Cada Solicitação:
1. **Implementação Direta:** Implementar as alterações solicitadas no código do projeto (`Finanças - Pessoais`).
2. **Preservação de Dados:** Nunca apagar ou sobrescrever os lançamentos do banco `dados_financeiros.sqlite`.
3. **App Original Intacto:** Nunca alterar nada em `App Rotina Familiar\rotina-familia`.
4. **Incremento de Versão:** Incrementar a versão no `public/version.json` para disparar a notificação nos dispositivos.
5. **Git Push Automático:** Gravar commit e fazer `git push origin main` para a conta `carlaoapp/app-financas-pessoais`.
6. **Entrega Pronta:** Sempre entregar ao usuário:
   - Resumo das mudanças feitas.
   - O link pronto para acessar ou baixar o app no celular e no computador.
   - Informar que quem já estiver com o app aberto/instalado receberá o aviso: **"Nova Versão Disponível! [ Atualizar App Agora ]"** para atualizar com 1 toque.
