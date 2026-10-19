-- Same id and title: texts and difficulty change for the endless variant.
update public.games
   set short = 'Salta sin fin antes de que suba la marea.',
       long = 'Carreteras y ríos se suceden sin final mientras una marea de neón sube a tus espaldas. Salta entre coches, súbete a troncos y tortugas, y cruza cada orilla de nenúfares para ganar ventaja. Un solo error y se acabó.',
       difficulty = 4
 where id = 'ranaria';
