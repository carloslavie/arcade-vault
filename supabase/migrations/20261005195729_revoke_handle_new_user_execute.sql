-- handle_new_user solo debe ejecutarse como trigger, nunca vía /rest/v1/rpc.
-- Los triggers no comprueban EXECUTE, así que on_auth_user_created sigue funcionando.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
