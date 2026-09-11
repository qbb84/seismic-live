package ls.eq.seismic.consume;

import ls.eq.seismic.model.Quake;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Component
@Getter
public class SeismicConsumer {

    private final List<Quake> quakeList;
    private final SimpMessagingTemplate messagingTemplate;

    public SeismicConsumer(@Autowired SimpMessagingTemplate simpMessagingTemplate) {
        this.quakeList = new CopyOnWriteArrayList<>();
        this.messagingTemplate = simpMessagingTemplate;
    }

    @Bean
    public NewTopic SeismicQuakesKafkaTopic() {
        return TopicBuilder.name("seismic.quakes")
                .partitions(3)
                .replicas(1)
                .build();
    }

    @KafkaListener(id = "fetchSeismicData", topics = "seismic.quakes")
    public void listen(Quake quake) {
        quakeList.add(quake);

        while (quakeList.size() > 200) {
            quakeList.remove(0);
        }

        messagingTemplate.convertAndSend("/topic/quakes", quake);
    }
}
