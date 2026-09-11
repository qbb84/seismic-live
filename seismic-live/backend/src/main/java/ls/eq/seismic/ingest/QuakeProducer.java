package ls.eq.seismic.ingest;

import ls.eq.seismic.model.FeatureCollection;
import ls.eq.seismic.model.Quake;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

@Component
@Slf4j
public class QuakeProducer {

    private final KafkaTemplate<String, Quake> template;
    private final HashSet<String> quakeIdCache;
    private final RestClient restClient;

    public QuakeProducer(@Autowired KafkaTemplate<String, Quake> template,
                         @Autowired RestClient.Builder restClient) {
        this.template = template;
        this.restClient = restClient
                .baseUrl("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson")
                .build();
        this.quakeIdCache = new HashSet<>();
    }


    @Scheduled(fixedRate = 60000)
    public void fetchFeed() {
        var featureCollection = restClient.get().retrieve().body(FeatureCollection.class);

        if (featureCollection == null || featureCollection.getFeatures().isEmpty()) {
            log.info("No JSON features found in response");
            return;
        }

        List<Quake> quakeList = new ArrayList<>();
        featureCollection.getFeatures().forEach(feature -> {
            if (quakeIdCache.contains(feature.getId())) {
                return;
            }

            quakeIdCache.add(feature.getId());
            Quake quake = new Quake();
            quake.setId(feature.getId());
            quake.setMagnitude(feature.getProperties().getMag());
            quake.setPlace(feature.getProperties().getPlace());
            quake.setLatitude(feature.getGeometry().getCoordinates().get(1));
            quake.setLongitude(feature.getGeometry().getCoordinates().get(0));
            quake.setDepthKm(feature.getGeometry().getCoordinates().get(2));
            quake.setTime(feature.getProperties().getTime());
            quake.setType(feature.getProperties().getType());
            quake.setTsunami(feature.getProperties().getTsunami());
            quakeList.add(quake);
        });


        publish(quakeList);
    }

    public void publish(List<Quake> quake) {
        quake.forEach(quakeData -> {
            template.send("seismic.quakes", quakeData);
        });
    }
}
