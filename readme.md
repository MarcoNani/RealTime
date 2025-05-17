# RealTime
*Non il canale televisivo*

## Caso d'uso di esempio
Tutti noi abbiamo quell'amico o quell'amica con il quale passiamo le serate in chat. Tutti noi sappiamo quello che si prova a fissare la scritta "sta scrivendo" sotto al nome dell'interlocutore.
Una volta che la scritta scompare e compare sul nostro display il messaggio noi lo leggiamo e poi inziamo a rispondere.
Non avete mai pensato "chissà cosa starà scrivendo" oppure "che spreco di tempo, se ci vedessimo di persona oppure se stassimo parlando al telefono sarebbe tutto più veloce"?
L'obbiettivo di **RealTime** è proprio questo: permettere di vedere ciò che l'interlocutore stà scrivendo man mano che lo scrive. Si risparmia così moltissimo tempo!
Teoricamente si può **quasi raddoppiare la velocità di comunicazione**!

RealTime vuole però andare oltre a questo e farci sentire davvero come se fossimo di fronte al nostro interlocutore. Grazie al suo design studiato attorno all'umano, le sue animazioni naturali e alla sua "interfaccia organica".

RealTime non ha come obbiettivo quello di rimpiazzare le applicazioni di messaggistica oggi esistenti e ampiamente diffuse ma ha come scopo quello di essere una "estensione" a queste ultime.

Torniamo all'esempio inziale: dopo avere scritto qualche messaggio su WhatsApp con il nostro amico e aver constatato che è dispobile per chattare entriamo su **RealTime** dove continueremo la chat ma adesso sentendoci ancora più vicini a lui.

Una volta terminata potremo, in modo semplice, generare un file di export della conversazione che abbiamo avuto da inoltrare sulla applicazione di messaggistica principale per poter rileggere e ricercare, anche a distanza di tempo, quello che ci siamo detti senza dover cercare in più app.

## Features
Siamo tutti famigliari con le applicazioni di messaggistica istantanea: il concetto di chat esiste oramai da molti anni ma noi vogliamo portare la messaggisatica istantanea al livello superiore!
### 1. Scrittura di messaggi in tempo reale:
Con RealTime è possibile vedere ciò che l'interlocutore sta scrivendo in tempo reale, lettera per lettera, in modo tale da avere una connessione ancora più vicina con lui, in modo tale da sentirsi ancora più vicini.

### 2. Messaggi vocali in tempo reale:
I messaggi vocali sono molto belli: ci permettono non solo di trasmettere all'altro quello che vogliamo dirgli con le parole ma anche di fargli capire meglio le **emozioni** che stiamo provando, grazie al tono della voce, e inoltre ci permettono di fare sentire all'altra persona dei **suoni** (che altrimenti dovremmo descrivere a parole).
I messaggi vocali hanno però due grandi difetti: **il primo difetto** è che, dall'inizio alla fine, dello scambio delle informazioni contenute in un messaggio vocale di 1 minuto ci si impiegano due minuti:
il primo minuto lo si impiega per registrare il messaggio
il secondo per sentire il messaggio.
Con RealTime il messaggio viene trasmesso in diretta. Anche in questo caso si riesce quasi a raddoppiare le informazioni trasmesse nello stesso tempo!
**Il secondo difetto** è dato dalla difficoltà che si ha nel ritrovare il messaggio desiderato e in generale a riascoltare i messaggi vocali.
In RealTime sarà possibile visualizzare la **trascrizione automatica dei messaggi vocali** ma anche **assegnare un "titolo"** a questi ultimi in modo da poter, a colpo d'occhio, capire di cosa si aveva parlato in quel messaggio.

### 3. Immagini in tempo reale:
Un altro aspetto importante nelle chat moderne sono le immagini (intese come foto e video).
Anche in RealTime sarà quindi possibile condividere foto/video, non solo saremo in grado di inviare foto/video già scattate ma saremo anche in grado di scattare foto/video direttamente dall'app. Queste ultime verranno condivise in tempo reale nel senso che da quando si apre la fotocamera l'interlocutore vedrà il nostro **flusso video che si fermerà nel momento in cui noi premeremo il tasto di scatto** per rimanere così fisso e impresso nella chat il fotogramma che abbiamo scattato.

### 4. Contatto con il *contatto*
Per creare una nuova chat su RealTime con un proprio amico sarà sufficente, e necessario, **trovarsi fisicamente vicini**, tramite la scansione reciproca di QR Code in pochi istanti e in modo automatico verrà creata la chatroom e avverrà lo scambio sicuro della chiave di cifratura che verrà memorizzata in modo sicuro all'interno del chip dedicato. Da questo momento in poi **sarà possibile chattare anche a migliaia di chilometri di distanza come se ci si trovasse ancora faccia a faccia come nel momento del *contatto***.
Niente username da condividere, niente numeri di telefono.
E chissà, magari un giorno qualcuno farà un viaggio per incontrarsi di persona con il proprio amico conosciuto online per poterci chattare su RealTime.

### 5. Cifratura:
Un altro importantissimo aspetto, quando si parla di messaggi, è la cifratura. RealTime utilizzerà tecniche avanzate di cifratura per permetterci di esprimerci in libertà e in sicurezza, tutto questo senza però generare difficoltà all'utente infatti lo scambio di chiavi avviene in modo automatico al momento del *contatto*. Più sicuro di così.
Il server di RealTime memorizzerà i dati necessari per lo scambio di messaggi solo per poco tempo e in ogni caso **il payload dei messaggi non sarà visibile in chiaro nemmeno a noi di RealTime**.

### 6. Portabilità:
I messaggi che vengono scambiati su RealTime sono di proprietà delle persone che se li scambiano. Vogliamo quindi permettervi di gestirli in modo più semplice possibile:
- realizzare dei **bei file di export** per visualizzare in modo carino i vostri messaggi al di fuori di RealTime.
- realizzare dei **file di export JSON** per permettervi di effettuare le elaborazioni che volete sui vostri messaggi, di importarli in altri sistemi o di visualizzarli come più preferite.

## Documentazione e altre cose da nerd
Noi di RealTime amiamo il software libero e per questo motivo vogliamo rendere il protocollo di comunicazione di RealTime, il sorgente del server web e del client per Android libero, leggibile e modificabile da chiunque:
sarà possibile utilizzare il server ufficiale di RealTime oppure hostarsi il proprio server in modo da non dover dipendere, e fidarsi, di nessuno.
Inoltre potete verificare voi stessi il codice del client e quindi verificare che la cifratura end-to-end sia davverò quella che noi vi diciamo sia.

### Documentazione
Il protocollo di comunicazione tramite WebSocket e le API saranno ben documentati in modo da poter facilmente contribuire al progetto oppure di scrivere il proprio personale client per RealTime.

## Piattaforme
Stiamo sviluppando un app Android nativa per utilizzare RealTime.


## Demo
Se volete saperne di più su RealTime vi invito a visitare il sito ufficiale raggiungibile collegandosi a [chatinrealtime.com](https://chatinrealtime.com).

Se siete curiosi di provare un assaggio di RealTime vi rimando alla demo disponibile collegandosi a [demo.chatinrealtime.com](https://www.chatinrealtime.com/wait.html).