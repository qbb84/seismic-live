package ls.eq.seismic.model;

import lombok.Data;

@Data
public class Quake {
    private String id;
    private Double magnitude;
    private String place;
    private double longitude;
    private double latitude;
    private double depthKm;
    private long time;
    private String type;
    private long tsunami;
}
