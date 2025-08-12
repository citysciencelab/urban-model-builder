
Dein Modell und dessen Ergebnisse können sich sehen lassen!
Mache dein Modell erfahrbar für andere User der Urban Model Builder - Community! 

## Einstellungen
Unter den Versionseinstellungen in der Sidebar findest du die Funktion "Veröffentlichen" mit folgenden Einstellungsmöglichkeiten:

| Eingabefelder     | Beschreibung       |
| ----------- |----------- |
| **Versionstyp**  |  Zur besseren Nachvollziehbarkeit,  Transparenz, Rückverfolgbarkeit und Kontrolle bei der Arbeit mit komplexen Modellen    |
| Minor  (Anzeige v0.1.0) |  Nur geringfügige Änderungen wurden vorgenommen, die die Struktur oder Logik des Modells nicht grundlegend ändern, zB neue oder optimierte Parameterwerte, Anpassungen von Gleichungen, Hinzufügen von Beschreibung oder Namensänderungen    |
| Major (Anzeige v1.0.0)  | Grundlegende Änderungen wurden vorgenommen, die die Struktur, Logik oder Grundannahmen des Modells deutlich verändern, zB neue Teilbereiche werden hinzugefügt, der Modellansatz oder Zielsetzung wird geändert |
| Veröffentlichen auf der API| Die [Urban Model Plattform](https://citysciencelab.github.io/urban-model-platform/content/index.html) bildet eine Schnittstelle zu unterschiedlichen Microservices, unter anderem dem Urban Model Builder, sodass die Daten in einem standardisierten Format auf anderen Plattformen zur Verfügung gestellt und genutzt werden können |
| Notizen  | Nur einsehbar in den Metadaten des Modells. Müssen eingetragen sein und min. 3 Zeichen lang sein, damit ein Modell veröffentlicht werden kann|

## Veröffentlichen als Modellserver Endpunkt
Du kannst dein Modell nicht nur über die grafische Nutzeroberfläche teilen, sondern auch maschinenlesbar über die OGC API Processes Schnittstelle. Wenn du dein Modell als Modellserver Endpunkt veröffentlichst, kann bespielsweise eine städtische Urban Model Plattform (UMP) oder direkt andere Anwendungen daran anknüpfen. Bei weiterem Interesse findest du hier mehr Infos zur [UMP](https://citysciencelab.github.io/urban-model-platform/content/03-architecture/overview.html).
Die Prüfung und Freigabe des Modells erfolgt durch einen Administrator des Urban Model Builders. Um eine Überprüfung anzufragen, schicke bitte eine E-Mail an cut@hcu-hamburg.de. Nach kurzer Zeit und erfolgreicher Prüfung erhält du eine Bestätigungsmail, dass dein Modell nun durch über die OGC API Processes zur Verfügung steht. 
Wenn du dein veröffentlichtes Modell löscht, wird es von allen Servern entfernt - auch deine Anfrage zur Freigabe verfällt automatisch. Mit dem Löschen des veröffentlichten Modells ziehst du nicht bloß die Veröffentlichung zurück. Es taucht dann auch nicht mehr bei deinen Modellen zur weiteren Bearbeitung auf. Wenn du die Veröffentlichung zurückziehen möchtest, aber dein Modell weiterhin bearbeiten möchtest, erstelle einen Klon oder einen neuen Entwurf.
Mit der Veröffentlichung deines Modells, stimmst du der Veröffentlichung unter der GPL-3.0 Lizenz zu. Weitere Infos zu der Lizenz findest du unter den [Nutzungsbedingungen](https://modelbuilder.comodeling.city/nutzungsbedingungen).

## Open-Source 
Unsere Vision verfolgt einen transparenten Ansatz für eine breite Teilhabe und einfache Zugänglichkeit zu Simulationsmodellen. 
Vielfältige Szenarien können damit besser exploriert und Systeme im gemeinsamen Austausch co-modelliert werden - zur Unterstützung von robusteren Entscheidungen!
Die Modellierung von komplexen Systemen ist längst schon nicht mehr ausschließlich die Aufgabe spezialisierter Softwareingenieure. Mit dem Aufkommen von Open-Source-Tools und webbasierten Plattformen wird das Feld zunehmend zugänglicher und hat es offenbar bis zu dir geschafft! Ganz einfach in deinem Browser und ohne Installation kannst du das komplett kostenfreie Angebot des Urban Model Builders testen.
Das Tool basiert auf der Open-Source Simulationsbibliothek [simulation](https://github.com/scottfr/simulation). Unter [https://github.com/citysciencelab/urban-model-builder](https://github.com/citysciencelab/urban-model-builder) findest du den genauen Aufbau der Softwarearchitektur des Tools und eine Anleitung zum Nachbauen!
