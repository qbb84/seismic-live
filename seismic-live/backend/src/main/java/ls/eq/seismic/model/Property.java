package ls.eq.seismic.model;

import lombok.Data;

@Data
public class Property {
    private Double mag;
    private String place;
    private String type;
    private int tsunami;
    private long time;
}
