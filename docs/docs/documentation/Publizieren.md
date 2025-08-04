---
sidebar_position: 8
---
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
  <TabItem value="modellteilen" label="Modell teilen">
    Arbeite in Echtzeit und gemeinsam mit anderen Usern an einem Modell! Indem du dein Modell teilst, lädst du andere User dazu ein das Modell mitzugestalten und ihre individuellen Sichtweisen einfließen zu lassen. 

## Einstellungen
Unter den Versionseinstellungen findest du die Funktion "Teilen" mit folgenden Einstellungsmöglichkeiten:

| Eingabefelder     | Beschreibung       |
| ----------- |----------- |
| E-Mail   |  E-Mailadresse des Empfängers   |
| Rolle |  Zuteilung der Erlaubnis des Empfängers       |
| Keine Berechtigung | Der Empfänger ist (noch) nicht autorisiert und das Modell wird ihm nicht angezeigt |
| Ansicht| Der Empfänger kann das Modell ausschließlich ansehen und nicht direkt bearbeiten |
| Mitarbeiter | Als Mitarbeiter kann der Empfänger das Modell bearbeiten/klonen und einen neuen Entwurf anlegen|
| Co-Inhaber | Neben dem Ersteller kann der Co-Inhaber das Modell zusätzlich zu der Bearbeitung teilen und veröffentlichen|
  </TabItem>
  <TabItem value="modellveröffentlichen" label="Modell veröffentlichen">
    Dein Modell und dessen Ergebnisse können sich sehen lassen!
Mache dein Modell erfahrbar für andere User der Urban Model Builders - Community! 

## Einstellungen

| Eingabefelder     | Beschreibung       |
| ----------- |----------- |
| **Versionstyp**  |  Zur besseren Nachvollziehbarkeit,  Transparenz, Rückverfolgbarkeit und Kontrolle bei der Arbeit mit komplexen Modellen    |
| Minor  (Anzeige v0.1.0) |  Nur geringfügige Änderungen wurden vorgenommen, die die Struktur oder Logik des Modells nicht grundlegend ändern, zB neue oder optimierte Parameterwerte, Anpassungen von Gleichungen, Hinzufügen von Beschreibung oder Namensänderungen    |
| Major (Anzeige v1.0.0)  | Grundlegende Änderungen wurden vorgenommen, die die Struktur, Logik oder Grundannahmen des Modells deutlich verändern, zB neue Teilbereiche werden hinzugefügt, der Modellansatz oder Zielsetzung wird geändert |
| Veröffentlichen auf der API| Die [Urban Model Plattform](https://citysciencelab.github.io/urban-model-platform/content/index.html) bildet eine Schnittstelle zu unterschiedlichen Microservices, unter anderem dem Urban Model Builder, sodass die Daten in einem standardisierten Format auf anderen Plattformen zur Verfügung gestellt und genutzt werden können |
| Notizen  | Nur einsehbar in den Metadaten des Modells. Müssen eingetragen sein und min. 3 Zeichen lang sein, damit Modell veröffentlicht werden kann|

## Veröffentlichen als Modellserver Endpunkt
Der Urban Model Builder stellt einen Microserver dar. Die von dir oder anderen Usern erstellten Modelle werden zunächst lokal auf dem Server beim jeweiligen Client durchgeführt und berechnet. Wenn du dein Modell als Modellserver Endpunkt veröffentlichst, kann die Urban Model Plattform (UMP) als API daran anknüpfen. Bei weiterem Interesse findest du hier mehr Infos zur [UMP](https://citysciencelab.github.io/urban-model-platform/content/03-architecture/overview.html).
Die Prüfung und Freigabe des Modells erfolgt durch einen Administrator nachdem du eine E-Mail an cut@hcu-hamburg.de gesendet hast. Nach kurzer Zeit, erhält du eine Bestätigungsmail, dass dein Modell nun durch die Schnittstelle der UMP auf unserem Server durchgeführt und berechnet werden kann. Dies bietet sich gerade bei komplexen Modellen an, die eine höhere Rechenkapazität erfordern. 
Wenn du dein veröffentlichtes Modell löscht, wird es von allen Servern entfernt - auch deine Anfrage zur Freigabe verfällt automatisch. Mit dem Löschen des veröffentlichten Modells ziehst du nicht bloß die Veröffentlichung zurück. Es taucht dann auch nicht mehr bei deinen Modellen zur weiteren Bearbeitung auf. Wenn du die Veröffentlichung zurückziehen möchtest, aber dein Modell weiterhin bearbeiten möchtest, erstelle einen Klon oder einen neuen Entwurf.
Mit der Veröffentlichung deines Modells, stimmst du der Veröffentlichung unter der GPL-3.0 Lizenz zu. Weitere Infos zu der Lizenz findest du unter den [Nutzungsbedingungen](https://modelbuilder.comodeling.city/nutzungsbedingungen).

## Open-Source 
Unsere Vision verfolgt einen transparenten Ansatz für eine breite Teilhabe und einfache Zugänglichkeit zu Simulationsmodellen. 
Vielfältige Szenarien explorieren und Systeme im gemeinsamen Austausch co-modellieren - Zur Unterstützung von robusteren Entscheidungen!
Die Modellierung von komplexen Systemen ist längst schon nicht mehr ausschließlich die Aufgabe spezialisierter Softwareingenieure. Mit dem Aufkommen von Open-Source- Tools und webbasierten Plattformen hat sich das Feld deutlich demokratisiert und hat es offenbar bis zu dir geschafft! Ganz einfach in deinem Browser und ohne Installation kannst du das komplett kostenfreie Angebot des Urban Model Builders testen.
Das Tool basiert auf der open-source Simulationsbibliothek simulation. Unter https://github.com/citysciencelab/urban-model-builder findest du den genauen Aufbau der Softwarearchitektur des Tools und eine Anleitung zum Nachbauen!

  </TabItem>
 </Tabs> 