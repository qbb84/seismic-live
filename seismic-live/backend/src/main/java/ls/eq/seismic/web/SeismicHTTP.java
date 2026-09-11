package ls.eq.seismic.web;

import ls.eq.seismic.consume.SeismicConsumer;
import ls.eq.seismic.model.Quake;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@CrossOrigin(origins = "http://localhost:5173")
public class SeismicHTTP {

    private final SeismicConsumer seismicConsumer;

    public SeismicHTTP(SeismicConsumer seismicConsumer) {
        this.seismicConsumer = seismicConsumer;
    }

    @GetMapping("/api/quakes/recent")
    public List<Quake> getSeismic() {
        return new ArrayList<>(seismicConsumer.getQuakeList());
    }
}
