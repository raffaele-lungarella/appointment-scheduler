<script>
  import { BARBER_SHOP_DETAILS } from "$lib/constants";
</script>

<svelte:head>
  <meta
    name="description"
    content="Informativa completa sulla privacy sul sito di Emi Hair Club."
  />
</svelte:head>

<article class="prose p-4 dark:prose-invert mx-auto max-w-2xl">
  <h1>Privacy Policy</h1>

  <section>
    <h2>Informazioni sul Trattamento dei Dati Personali</h2>
    <p>
      La presente informativa descrive le modalità di gestione dei dati personali degli utenti che
      utilizzano il nostro servizio di prenotazione online per il nostro salone di barbiere.
      L'informativa è resa ai sensi dell'Art. 13 del Regolamento UE 2016/679 (GDPR).
    </p>
  </section>

  <section>
    <h2>Titolare del Trattamento</h2>
    <p>
      Il Titolare del trattamento dei dati personali è Emiliano Lo Russo | Emi Hair Club, con sede
      in {BARBER_SHOP_DETAILS.street}, contattabile all'indirizzo email {BARBER_SHOP_DETAILS.email}.
    </p>
  </section>

  <section>
    <h2>Tipologia di Dati Raccolti</h2>
    <p>Raccogliamo i seguenti dati personali:</p>
    <ul>
      <li>
        <strong>Per gli utenti non registrati che effettuano prenotazioni</strong>: nome e indirizzo
        email, servizio richiesto e data/ora della prenotazione.
      </li>
      <li>
        <strong>Per gli utenti registrati</strong>: nome, indirizzo email e cronologia delle
        prenotazioni.
      </li>
    </ul>
  </section>

  <section>
    <h2>Finalità e Base Giuridica del Trattamento</h2>
    <p>I dati personali sono trattati per le seguenti finalità:</p>
    <ul>
      <li>
        Gestione delle prenotazioni per i servizi richiesti (base giuridica: esecuzione di un
        contratto o di misure precontrattuali - Art. 6.1.b GDPR)
      </li>
      <li>
        Comunicazioni relative alla prenotazione effettuata (conferme, modifiche, cancellazioni -
        base giuridica: esecuzione di un contratto - Art. 6.1.b GDPR)
      </li>
      <li>
        Adempimento di obblighi legali, contabili e fiscali (base giuridica: obbligo legale - Art.
        6.1.c GDPR)
      </li>
    </ul>
  </section>

  <section>
    <h2>Modalità e Durata del Trattamento</h2>
    <p>
      I dati sono trattati mediante strumenti informatici e/o telematici, con modalità organizzative
      e logiche strettamente correlate alle finalità indicate.
    </p>
    <ul>
      <li>
        <strong>Per gli utenti non registrati</strong>: i dati relativi alla prenotazione (nome,
        email, servizio, data) vengono conservati solo per il tempo necessario a gestire la
        prenotazione e vengono eliminati dopo l'erogazione del servizio.
      </li>
      <li>
        <strong>Per gli utenti registrati</strong>: i dati dell'account (nome e email) vengono
        conservati fino alla cancellazione dell'account da parte dell'utente o fino a 24 mesi di
        inattività.
      </li>
    </ul>
  </section>

  <section>
    <h2>Natura del Conferimento dei Dati</h2>
    <p>
      Il conferimento dei dati personali è necessario per effettuare una prenotazione. Il rifiuto di
      fornire tali dati comporta l'impossibilità di erogare il servizio di prenotazione online.
    </p>
  </section>

  <section>
    <h2>Destinatari dei Dati</h2>
    <p>I dati personali potrebbero essere comunicati a:</p>
    <ul>
      <li>Personale interno autorizzato al trattamento</li>
      <li>
        Fornitori di servizi tecnici (hosting, email, ecc.) che agiscono come responsabili del
        trattamento
      </li>
      <li>Autorità pubbliche, ove richiesto dalla legge</li>
    </ul>
    <p>
      Non viene effettuata alcuna diffusione dei dati personali a terzi per finalità commerciali o
      di marketing.
    </p>
  </section>

  <section>
    <h2>Diritti degli Interessati</h2>
    <p>
      Gli utenti possono esercitare i diritti previsti dagli articoli da 15 a 22 del GDPR, tra cui:
    </p>
    <ul>
      <li>Diritto di accesso ai propri dati personali</li>
      <li>Diritto di rettifica di dati inesatti</li>
      <li>Diritto alla cancellazione dei dati</li>
      <li>Diritto di limitazione del trattamento</li>
      <li>Diritto alla portabilità dei dati</li>
      <li>Diritto di opposizione al trattamento</li>
    </ul>
    <p>
      Per esercitare tali diritti, è possibile contattare il Titolare all'indirizzo email [email di
      contatto].
    </p>
  </section>

  <section>
    <h2>Gestione e Cancellazione dei Propri Dati</h2>
    <p>
      Gli utenti registrati possono gestire e modificare i propri dati personali in qualsiasi
      momento tramite l'area profilo del sito.
    </p>
    <p>
      <strong>Cancellazione dei dati</strong>: Nell'area profilo è disponibile un'opzione specifica
      che permette all'utente di eliminare completamente tutti i dati relativi alla propria utenza.
      La cancellazione comporta la rimozione definitiva di nome, email e di qualsiasi altro dato
      associato al profilo dai nostri database.
    </p>
    <p>
      Dopo la cancellazione, sarà necessario registrarsi nuovamente per poter effettuare
      prenotazioni come utente registrato.
    </p>
  </section>

  <section>
    <h2>Reclami</h2>
    <p>
      È possibile presentare un reclamo all'autorità di controllo competente (in Italia, il Garante
      per la Protezione dei Dati Personali - www.garanteprivacy.it).
    </p>
  </section>

  <section>
    <h2>Modifiche alla Privacy Policy</h2>
    <p>
      La presente Privacy Policy può essere soggetta a modifiche. Si consiglia di consultare
      regolarmente questa pagina per verificare eventuali aggiornamenti.
    </p>
  </section>

  <footer>
    <p>Data ultimo aggiornamento: 3 Maggio 2025</p>
  </footer>
</article>
