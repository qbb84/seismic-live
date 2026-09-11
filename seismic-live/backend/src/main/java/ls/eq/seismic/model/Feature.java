package ls.eq.seismic.model;

import lombok.Data;

@Data
public class Feature {
    String id;
    Property properties;
    Geometry geometry;
}
