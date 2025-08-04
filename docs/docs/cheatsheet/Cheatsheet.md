import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Cheatsheet
<Tabs>
  <TabItem value="primitives" label="Primitives" default>


Hier findest du alle Funktionsbausteine auf einem Blick!

| Primitive     | Typ |    Bedeutung       | Beispiele |
| ----------- | ----------- |----------- | ----------- |
| ![stock](./img/stock.png)  | SD     | 1.Akkumulierte Größen bzw. Werte, die sich im Laufe der Zeit ansammeln oder abbauen 2.Speichert aktuellen Wert zu unterschiedlichen Berechnungszeitschritten 3.Ändert sich durch Zuflüsse (Inflows) oder Abflüsse (Outflows)  | Bevölkerungszahl, Wasserstand, Energieinhalt | 
| ![flow](./img/flow.png)  | SD     | 1.Beschreiben die Geschwindigkeit, mit der sich ein Bestand aufbaut oder abbaut 2.Verändern den Stock, aber speichern selbst keine Werte 3.Können von anderen Variablen abhängen | Geburtenrate, Wasserzufluss, Energieverbrauch | 
| ![OGC API feature](./img/API.png)  | Common     | 1.Moderner Standard des Open Geospatial Consortium (OGC) 2.Bereitstellung und Abfrage von Geodaten über Webschnittstellen 3.Datensätze aus Geoportal über das Masterportal Hamburg | Volkszählungen, Bezirksdaten, Infrastruktur | 
| ![variable](./img/variable.png)  | Common     | 1.Größenveränderliche Einflussfaktoren 2.Keine Speicherfunktion der Werte  3.Beeinflussen andere Berechnungsgrößen |  | 
| ![converter](./img/converter.png)  | Common     | 1.Führt eine Berechnung, Transformation oder Ableitung aus anderen Variablen oder Konstanten durch 2.Ähnlich wie Hilfsvariable und speichert keine Werte, sondern wird bei jeder Simulationszeit neu berechnet  3.Stellt grafisch Input-Output Relationen dar|  |
| ![folder](./img/folder.png)  | common    | 1.Strukturgebendes Element, welches die Organisation eines Modells vereinfacht  2.Ausgewählte Modellteile können gesammelt, gruppiert und bewegt werden |  |
| ![state](./img/state.png)  | ABM     | 1.Bezeichnet Zustand von aktueller Situation oder Konfiguration eines Agenten, die sein Verhalten beeinflusst 2.Wechseln von einem State in einen anderen, ausgelöst durch Regeln, Wahrscheinlichkeiten oder Umwelteinflüsse |  |
| ![transition](./img/transition.png)  | ABM     | 1.Bezeichnen Übergänge zwischen den Zuständen eines Agenten 2.Wann und unter welchen Bedingungen soll Agent von einem Zustand in einen anderen wechseln? |  |
| ![action](./img/action.png)  | ABM     | 1.Konkrete Handlungen, die ein Agent während eines Zustandes oder bei einem Zustandswechsels (Transitions) ausführt 2.Beschreiben operationale Verhaltensregeln, wie beispielsweise sich bewegen, mit anderen Agenten interagieren, Ressourcen verbrauchen etc. |  |
| ![agent](./img/agent.png)  | ABM     | 1.Ist autonome Entität, die eigene Zustände, Eigenschaften und Verhaltensregeln besitzt  2.Kann mit ihrer Umwelt und anderen Agenten interagieren 3.Können eigenständige Entscheidungen treffen, zustandsabhängig handeln, sich verändern und lokal interagieren |  |
| ![population](./img/population.png)  | ABM     | 1.Gesamtheit aller Agenten eines bestimmten Typs innerhalb eines Modell  2.Kollektive Menge an Agenten haben gemeinsame Eigenschaften oder Verhaltenstypen |  |



  </TabItem>
  <TabItem value="interface" label="Interface">
    Hier findest du alle wichtigen Komponenten der Benutzeroberfläche auf einem Blick!
    ![interface](./img/interface.png)
<img src="./img/interface.png" width="200" height="100"/>

  </TabItem>
  <TabItem value="funktionen" label="Funktionen">
    Hier findest du die grundlegensten Funktionen auf einem Blick!
  </TabItem>
  <TabItem value="fragenkatalog" label="Fragenkatalog">
    Hier findest du eine Liste an Denkanstößen zum Thema Modellieren auf einem Blick!
  </TabItem>
   <TabItem value="glossar" label="Glossar">
    Hier findest du einige wichtige Begriffsdefinitionen auf einem Blick!

    | Begriff                            |Erklärung                                                                                                                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| *Modellstruktur*                     | Die formale Organisation eines Modells, bestehend aus Gleichungen, Abhängigkeiten (SD) oder Zuständen, Regeln und Interaktionen (ABM). Sie definiert die funktionale Logik des Systems.        |
| *Kausaldiagramm*                     | Visualisierung von Ursache-Wirkungs-Beziehungen, oft als Vorstufe oder Dokumentation für SD-Modelle genutzt. Zeigt qualitative Systemzusammenhänge.                                            |
| *Systemgrenze*                       | Abgrenzung des modellierten Systems von seiner Umwelt. Legt fest, welche Variablen einbezogen und welche ausgeklammert werden.                                                                 |
| *Initialisierung*                    | Definition der Anfangsbedingungen eines Modells (z. B. Startwerte, Konfigurationen). Essenziell für Reproduzierbarkeit und Vergleichbarkeit von Simulationen.                                  |
| *Diskretisierung*                    | Umwandlung kontinuierlicher Prozesse in diskrete Zeitschritte (v. a. in SD-Modellen). Beeinflusst numerische Genauigkeit und Laufzeit.                                                         |
| *Agenteninteraktion*                 | In ABM: explizite Kopplung von Agenten durch räumliche Nähe, Regeln, Netzwerke oder Nachrichtenübermittlung. Führt zu emergentem Verhalten.                                                    |
| *Regelbasierte Modellierung*         | Modellansatz, bei dem Entscheidungen oder Zustandsübergänge auf expliziten Regeln beruhen. Dominant in ABM, v. a. bei Zustandstransitionen.                                                    |
| *Dynamische Rückkopplung*            | Zirkuläre Kausalbeziehungen, die sich über Zeit entfalten. Zentral in SD: Positive Rückkopplung führt zu Wachstum, negative zu Stabilisierung.                                                 |
| *Szenarienmanagement*                | Methodisches Vorgehen zur Definition, Durchführung und Bewertung verschiedener Zukunftsentwicklungen. In SD meist durch Parameterkombinationen, in ABM zusätzlich durch alternative Regelsets. |
| *Robuste Entscheidungsunterstützung* | Identifikation von Strategien, die unter hoher Unsicherheit und vielen möglichen Zukunftslagen tragfähig bleiben (z. B. mit Robust Decision Making).                                           |
| *Kalibrierung*                       | Anpassung von Modellparametern an empirische Daten, um die Passung zur beobachteten Realität zu optimieren.                                                                                    |
| *Verifikation*                       | Technische Prüfung, ob das Modell korrekt implementiert ist. „Bauen wir das Modell richtig?“ – z. B. Debugging, Einheitentests, Review des Quelltexts.                                         |
| *Validierung*                        | Beurteilung, ob das Modell mit dem realen System konsistent ist. „Bauen wir das richtige Modell?“ – z. B. über Expertenfeedback, Datenvergleich, Retrodiktion.                                 |
| *Hybridmodellierung*                 | Kombination unterschiedlicher Modellparadigmen (z. B. SD+ABM oder ABM+statistische Modelle), um sowohl individuelle als auch systemische Dynamiken abzubilden.                                 |
| *Modellevaluation*                   | Ganzheitliche Bewertung eines Modells hinsichtlich seiner Annahmen, Logik, Ergebnisse, Plausibilität, Transparenz und Anwendbarkeit.                                                           |
| *Verhaltensannahmen*                 | Theoretisch oder empirisch abgeleitete Hypothesen darüber, wie Akteure Entscheidungen treffen oder Zustände wechseln. Kritisch für ABM.                                                        |
| *Versionierung*                      | Nachvollziehbare Speicherung von Entwicklungsständen eines Modells (z. B. über Git). Essenziell für Reproduzierbarkeit und Zusammenarbeit.                                                     |
| *Modelltransparenz*                  | Maß, in dem ein Modell, seine Struktur und seine Annahmen offen dokumentiert und verständlich gemacht werden. Grundlage für Vertrauen und Weiterverwendung.                                    |
| *Erklärbarkeit (Explainability)*     | Die Fähigkeit, die Ergebnisse und Abläufe eines Modells (v. a. bei stochastischen oder KI-gestützten Modellen) nachvollziehbar zu machen. 

  </TabItem>
</Tabs>


